import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import GameUser from '../../user';
import GameSession from '../../user/session';
import { createTable, createIndex } from '../helper';

export default class User implements DB.User {
	conn: r.Connection;
	table: r.Table;
	public async init(ctx: Context, conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = r.table('user');
	}
	public async setupSchema(ctx: Context, conn: r.Connection): Promise<void> {
		this.table = await createTable(conn, 'user', 'uuid');
		await createIndex(conn, this.table, 'name');
		await createIndex(conn, this.table, 'email');
	}

	list(ctx: Context): Promise<GameUser[]> {
		throw new Error("Method not implemented.");
	}
	get(ctx: Context, uuid: string): Promise<GameUser> {
		throw new Error("Method not implemented.");
	}
	getByName(ctx: Context, name: string): Promise<GameUser> {
		throw new Error("Method not implemented.");
	}
	watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUser>>): Promise<void> {
		throw new Error("Method not implemented.");
	}
	create(ctx: Context, user: GameUser): Promise<GameUser> {
		throw new Error("Method not implemented.");
	}
	patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser> {
		throw new Error("Method not implemented.");
	}
	delete(ctx: Context, uuid: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
}