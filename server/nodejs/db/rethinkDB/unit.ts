import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import { createTable, createIndex, clearSpareIndices, startDBCall } from '../helper';
import { WrappedError } from '../../logger';

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

    each(ctx: Context, fn: DB.Handler<any>): Promise<void> {
        throw new Error("Method not implemented.");
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
    watchPathing(ctx: Context, fn: DB.Handler<any>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getAtChunk(ctx: Context, hash: string): Promise<any[]> {
        throw new Error("Method not implemented.");
    }
    getUnprocessedPath(ctx: Context): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<any> {
        throw new Error("Method not implemented.");
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