import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import { createTable, createIndex, clearSpareIndices, startDBCall } from '../helper';
import logger, { WrappedError, DetailedError } from '../../logger';
import env from '../../config/env';
import { rethinkEach } from '.';

export default class DBUnit implements DB.DBUnit {
  public conn!: r.Connection;
  public table!: r.Table;

  public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
    this.conn = conn;
    this.table = r.table(`${planetName}_unit`);
  }
  public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
    this.table = await createTable(conn, `${planetName}_unit`, 'uuid');

    const VALID_INDICES = ['location.chunkHash', 'location.hash', 'details.lastTick', 'details.owner'];

    await createIndex(this.conn, this.table, 'location.hash', true);
    await createIndex(this.conn, this.table, 'location.chunkHash', true);
    await createIndex(this.conn, this.table, 'details.lastTick');
    await createIndex(this.conn, this.table, 'details.owner');
    await clearSpareIndices(this.conn, this.table, VALID_INDICES);
  }

  public async each(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
    const cursor = await this.table.run(this.conn);
    await rethinkEach(cursor, ctx, fn);
  }
  public async get(ctx: Context, uuid: string): Promise<Unit> {
    const call = await startDBCall(ctx, 'getUnit');
    const c = await this.table.get(uuid).run(this.conn);
    await call.end();
    return c as any;
  }
  public async create(ctx: Context, unit: Unit): Promise<Unit> {
    const call = await startDBCall(ctx, 'createUnit');
    const result = await this.table.insert(unit).run(this.conn);
    await call.end();
    return unit; // doesn't change Unit
  }
  public async getBulk(ctx: Context, uuids: string[]): Promise<{ [uuid: string]: Unit; }> {
    const call = await startDBCall(ctx, 'createUnit');
    const cursor = await this.table.getAll(...uuids).run(this.conn);
    const res: { [key: string]: Unit } = {};
    const units: Unit[] = await cursor.toArray();
    units.forEach((unit: Unit) => res[unit.uuid] = unit);
    await call.end();
    return res;
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    const call = await startDBCall(ctx, 'deleteUnit');
    await this.table.get(uuid).delete().run(this.conn);
    await call.end();
  }
  public async patch(ctx: Context, uuid: string, patch: Partial<Unit>): Promise<Unit> {
    const call = await startDBCall(ctx, 'updateUnit');
    const result = await this.table.get(uuid).update(patch,
      { durability: 'hard', returnChanges: 'always' as any }).run(this.conn);
    await call.end();
    return (result as any).changes[0].new_val;
  }
  public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<Unit>>): Promise<void> {
    this.table.changes().run(this.conn).then((cursor: any) => {
      return rethinkEach(cursor, ctx, fn);
    }).catch((err) => {
      logger.trackError(ctx, new WrappedError(err, 'watching units'));
    });
  }
  public async watchPathing(ctx: Context, fn: DB.Handler<any>): Promise<void> {
    this.table.filter(r.row.hasFields({ movable: { destination: true } }))
      .filter(r.row('movable')('isPathing').eq(false))
      .filter(r.row('movable')('path').eq([]))
      .changes().run(this.conn).then((cursor: any) => {
        return rethinkEach(cursor, ctx, fn);
      }).catch((err) => {
        logger.trackError(ctx, new WrappedError(err, 'watching for paths'));
      });
  }
  public getAtChunk(ctx: Context, hash: string): Promise<any[]> {
    throw new Error('Method not implemented.');
  }
  public async getUnprocessedPath(ctx: Context): Promise<Unit | null> {
    const delta: any = await this.table.filter(r.row.hasFields({ movable: { destination: true } }))
      .filter(r.row('movable')('isPathing').eq(false))
      .filter(r.row('movable')('path').eq([]))
      .limit(env.pathChunks)
      .update((unit: any): any => {
        return (r.branch as any)(
          unit('movable')('isPathing').eq(false),
          { movable: { isPathing: true, pathUpdate: Date.now() } }, {},
        );
      }, {
          durability: 'hard',
          returnChanges: true,
        }).run(this.conn);
    if (!delta.changes || delta.changes.length !== 1) {
      return null;
    }
    return delta.changes[0].new_val;
  }
  public async getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
    const call = await startDBCall(ctx, 'getUnprocessedUnitUUIDs');
    const cursor = await this.table.filter(r.row('details')('lastTick').lt(tick))
      // .limit(env.unitProcessChunks) // TODO
      .pluck('uuid')
      .run(this.conn);
    await call.end();
    const res = await cursor.toArray();
    return res.map((obj) => obj.uuid);
  }
  public async claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit | null> {
    const call = await startDBCall(ctx, 'getUnprocessedUnitUUIDs');
    const delta: any = await this.table.get(uuid).update(r.branch(
      r.row('details')('lastTick').ne(tick), { details: { lastTick: tick } } as any, {} as any),
      { returnChanges: true, durability: 'soft' }).run(this.conn);
    await call.end();
    if (!delta.changes || delta.changes.length !== 1) {
      return null;
    }
    return delta.changes[0].new_val;
  }
  public async listPlayersUnits(ctx: Context, uuid: string): Promise<Unit[]> {
    const call = await startDBCall(ctx, 'listPlayersUnits');
    const cursor = await this.table.getAll(uuid, { index: 'details.owner' }).run(this.conn);
    const units = await cursor.toArray();
    await call.end();
    return units;
  }
  public async pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
    const delta: any = await this.table.get(uuid).update((self: any): any => {
      return {
        storage: {
          [type]: (r as any).max([0, self('storage')(type).sub(amount)]),
        },
      };
    }, { returnChanges: true }).run(this.conn);

    if (delta.replaced !== 1 || delta.changes.length !== 1) {
      throw new DetailedError('failed to pull resource', { type, amount, uuid });
    }

    const movedAmount = delta.changes[0].old_val.storage[type] - delta.changes[0].new_val.storage[type];

    return movedAmount;
  }
  public async putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
    const maxField = type === 'iron' ? 'maxIron' : 'maxFuel';
    const delta: any = await this.table.get(uuid).update((self: any): any => {
      return {
        storage: {
          [type]: (r as any).min([self('storage')(maxField), self('storage')(type).add(amount)]),
        },
      };
    }, { returnChanges: true }).run(this.conn);

    if (delta.replaced !== 1 || delta.changes.length !== 1) {
      return 0;
    }

    const movedAmount = delta.changes[0].new_val.storage[type] - delta.changes[0].old_val.storage[type];

    return movedAmount;
  }
  public count(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public countAwake(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public countUnprocessed(): Promise<number> {
    throw new Error('Method not implemented.');
  }

}
