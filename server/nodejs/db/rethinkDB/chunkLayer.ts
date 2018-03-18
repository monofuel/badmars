import * as r from 'rethinkdb';
import * as DB from '../';
import Context from '../../context';
import { startDBCall, createTable } from '../helper';
import GameChunkLayer from '../../map/chunkLayer';
import { DetailedError } from '../../logger/index';
import logger from '../../logger';

export default class ChunkLayer implements DB.DBChunkLayer {
  public conn!: r.Connection;
  public table!: r.Table;
  public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
    this.conn = conn;
    this.table = r.table(`${planetName}_chunkLayer`);
  }
  public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
    this.table = await createTable(conn, `${planetName}_chunkLayer`, 'hash');
  }
  public async create(ctx: Context, layer: GameChunkLayer): Promise<GameChunkLayer> {
    const call = await startDBCall(ctx, 'saveChunkLayer');
    logger.info(ctx, 'creating chunk', { hash: layer.hash });
    await this.table.insert(layer).run(this.conn);
    await call.end();
    return layer; // we don't actually change the chunk
  }
  public findChunkForUnit(ctx: Context, uuid: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  public each(ctx: Context, fn: DB.Handler<GameChunkLayer>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public async get(ctx: Context, hash: string): Promise<GameChunkLayer> {
    const call = await startDBCall(ctx, 'getChunkLayer');
    const c = await this.table.get(hash).run(this.conn);
    await call.end();
    return c as any;
  }
  public async setEntity(ctx: Context, hash: string, layer: MovementLayer, uuid: string, tileHash: string):
    Promise<GameChunkLayer> {
    ctx.check('setEntity');
    const entityUpdate: EntityMapType = {};
    entityUpdate[tileHash] = uuid; // copy to save to DB

    // set the unit in the unit map in the DB without clobbering existing values.
    // if the tileHash key is already set, that means another unit beat us to this
    // location and we will be returning false.
    const mergeObject: any = {};
    mergeObject[layer] = entityUpdate;
    const delta = await this.table.get(hash).update((self: any): any => {
      return r.branch(
        self(layer).hasFields(tileHash), {} as any,
        self.merge(mergeObject),
      );
    }, { returnChanges: true }).run(this.conn);

    // if the update was successful, then the unit is successfully set at the location
    if (delta.replaced === 1) {
      return this.get(ctx, hash);
    }

    throw new DetailedError('failed to set entity at tile', { uuid });

  }
  public clearEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string):
    Promise<GameChunkLayer> {
    throw new Error('Method not implemented.');
  }
}
