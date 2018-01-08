import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import { createTable } from '../helper';

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
	get(ctx: Context, hash: string): Promise<any> {
		throw new Error("Method not implemented.");
	}
	patch(ctx: Context, uuid: string, chunk: Partial<any>): Promise<any> {
		throw new Error("Method not implemented.");
	}
	create(ctx: Context, chunk: any): Promise<any> {
		throw new Error("Method not implemented.");
	}


}