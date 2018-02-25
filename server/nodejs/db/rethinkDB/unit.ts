import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import { createTable, createIndex, clearSpareIndices, startDBCall } from '../helper';
import { WrappedError } from '../../logger';
import env from '../../config/env';

export default class DBUnit implements DB.DBUnit {
    conn: r.Connection;
    table: r.Table;

    public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
        this.conn = conn;
        this.table = r.table(`${planetName}_unit`);
    }
    public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
        this.table = await createTable(conn, `${planetName}_unit`, 'uuid');

        const VALID_INDICES = ['location.chunkHash', 'location.hash', 'details.lastTick'];

        await createIndex(this.conn, this.table, 'location.hash', true);
        await createIndex(this.conn, this.table, 'location.chunkHash', true);
        await createIndex(this.conn, this.table, 'details.lastTick');
        await clearSpareIndices(this.conn, this.table, VALID_INDICES);
    }

    async each(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
        const cursor = await this.table.run(this.conn);
        // TODO this could be done in parallel
        await cursor.each(async(err: Error, unit: Unit) => {
            if (err) {
                throw err;
            }
            await fn(ctx, unit);
        })

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
    async getBulk(ctx: Context, uuids: string[]): Promise<{ [uuid: string]: Unit; }> {
        const call = await startDBCall(ctx, 'createUnit');
        const units = await this.table.getAll(...uuids).run(this.conn);
        const res: { [key: string]: Unit } = {};
        units.each((err: Error, unit: Unit) => {
            if (err) {
                throw new WrappedError(err, 'iterating over getBulk');
            }
            res[unit.uuid] = unit;
        });
        await call.end();
        return res;
    }
    async delete(ctx: Context, uuid: string): Promise<void> {
        const call = await startDBCall(ctx, 'deleteUnit');
        await this.table.get(uuid).delete().run(this.conn);
        await call.end();
    }
    async patch(ctx: Context, uuid: string, patch: Partial<Unit>): Promise<Unit> {
        const call = await startDBCall(ctx, 'updateUnit');
        const result = await this.table.get(uuid).update(patch, { durability: 'hard', returnChanges: 'always' as any }).run(this.conn);
        await call.end();
        return (result as any).changes[0].new_val;
    }
    watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<any>>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async watchPathing(ctx: Context, fn: DB.Handler<any>): Promise<void> {
        this.table.filter(r.row.hasFields({ movable: { destination: true } }))
        .filter(r.row('movable')('isPathing').eq(false))
        .filter(r.row('movable')('path').eq([]))
        .changes().run(this.conn).then((cursor: any) => {
            return cursor.each(async (err: Error, unit: Unit) => {
                if (err) {
                    throw err;
                }
                await fn(ctx, unit);
            });
        });
    }
    getAtChunk(ctx: Context, hash: string): Promise<any[]> {
        throw new Error("Method not implemented.");
    }
    async getUnprocessedPath(ctx: Context): Promise<Unit> {
        const delta: any = await this.table.filter(r.row.hasFields({ movable: { destination: true } }))
			.filter(r.row('movable')('isPathing').eq(false))
			.filter(r.row('movable')('path').eq([]))
			.limit(env.pathChunks)
			.update((unit: any): any => {
				return (r.branch as any)(
					unit('movable')('isPathing').eq(false), { movable: { isPathing: true, pathUpdate: Date.now() } }, {}
				);
			}, {
				durability: 'hard',
				returnChanges: true
            }).run(this.conn);
        if (!delta.changes || delta.changes.length !== 1) {
            return null;
        }
        return delta.changes[0].new_val;
    }
    async getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
        const call = await startDBCall(ctx, 'getUnprocessedUnitUUIDs');
        const cursor = await this.table.filter(r.row('details')('lastTick').lt(tick))
            .limit(env.unitProcessChunks)
            .pluck('uuid')
            .run(this.conn);
        await call.end();
        const res = await cursor.toArray();
        return res.map((obj) => obj.uuid);
    }
    async claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit | null> {
        const call = await startDBCall(ctx, 'getUnprocessedUnitUUIDs');
        const delta: any = await this.table.get(uuid).update(r.branch(
				r.row('details')('lastTick').ne(tick), { details: { lastTick: tick} } as any, {} as any), { returnChanges: true, durability: 'soft' }).run(this.conn);
        await call.end();
        if (!delta.changes || delta.changes.length !== 1) {
			return null;
		}
		return delta.changes[0].new_val;
    }
    listPlayersUnits(ctx: Context, uuid: string): Promise<any[]> {
        throw new Error("Method not implemented.");
    }
    pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    count(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    countAwake(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    countUnprocessed(): Promise<number> {
        throw new Error("Method not implemented.");
    }

}
