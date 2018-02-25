import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import GameUser from '../../user';
import GameSession from '../../user/session';
import { createTable } from '../helper';

export default class Session implements DB.Session {
	conn: r.Connection;
	table: r.Table;
	public async init(ctx: Context, conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = r.table('session');
	}
	public async setupSchema(ctx: Context, conn: r.Connection): Promise<void> {
		this.table = await createTable(conn, 'session');
	}

	createBearer(ctx: Context, uuid: string): Promise<GameSession> {
		throw new Error("Method not implemented.");
	}
	getBearerUser(ctx: Context, token: string): Promise<GameUser> {
		throw new Error("Method not implemented.");
	}
}