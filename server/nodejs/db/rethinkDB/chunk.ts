import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import { createTable, startDBCall } from '../helper';

export default class DBChunk implements DB.DBChunk {
	conn: r.Connection;
	table: r.Table;
	public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
		this.conn = conn;
		this.table = r.table(`${planetName}_chunk`);
	}
	public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
		this.table = await createTable(conn, `${planetName}_chunk`, 'hash');
	}

	each(ctx: Context, fn: DB.Handler<any>): Promise<void> {
		throw new Error("Method not implemented.");
	}
	public async get(ctx: Context, hash: string): Promise<Chunk> {
		const call = await startDBCall(ctx, 'getChunk');
		const c = await this.table.get(hash).run(this.conn);
		await call.end();
		return c as any;

	}
	public async patch(ctx: Context, hash: string, chunk: Partial<Chunk>): Promise<Chunk> {
		const call = await startDBCall(ctx, 'updateChunk');
		const result = await this.table.get(hash).update(chunk, { returnChanges: true }).run(this.conn);
		await call.end();
		throw new Error("Method not implemented.");
	}
	public async create(ctx: Context, chunk: Chunk): Promise<Chunk> {
		const call = await startDBCall(ctx, 'saveChunk');
		await this.table.insert(chunk).run(this.conn);
		await call.end();
		return chunk; // we don't actually change the chunk
	}


}