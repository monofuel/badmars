
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as r from 'rethinkdb';
import { DetailedError } from '../util/logger';
import {createTable, createIndex, startDBCall } from './helper';
import Context from '../util/context';
import User from '../user/user';
import Logger from '../util/logger';

type UUID = string;

export default class DBUser {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'user';
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = r.table(this.tableName);
	}

	async setup(conn: r.Connection, logger: Logger): Promise<void> {
		this.table = await createTable(conn, logger, this.tableName, 'uuid');
		await createIndex(conn, logger, this.table, 'name');
		await createIndex(conn, logger, this.table, 'email');
	}

	// TODO should use socketFilter sanitizeUser() instead
	async listAllSanitizedUsers(): Promise<Array<Object>> {
		const cursor = await this.table.run(this.conn);
		const list = await cursor.toArray();
		const sanitized = [];
		for(const user of list) {
			sanitized.push({
				uuid: user.uuid,
				name: user.name,
				color: user.color
			});
		}
		return sanitized;
	}

	async getUserByUUID(ctx: Context, uuid: UUID): Promise<User> {
		const call = await startDBCall(ctx, 'getUserByUUID');
		const doc = await this.table.get(uuid).run(this.conn);
		if (!doc) {
			throw new DetailedError('user not found', { uuid });
		}
		const user = new User();
		user.clone(doc);
		await call.end();
		return user;
	}

	async getUser(name: string): Promise<User> {
		const cursor = await this.table.getAll(name, {
			index: 'name'
		}).run(this.conn)
		const docs = await cursor.toArray();
		if (docs.length !== 1) {
			return null;
		}
		const user = new User();
		user.clone(docs[0]);
		return user;
	}

	async registerListener(fn: (err: Error, row: any) => void): Promise<void> {
		const cursor = await this.table.changes().run(this.conn);
		cursor.each(fn);
	}

	async createUser(name: string, color: string): Promise<any> {
		const user = new User(name, color);
		return this.table.insert(user, {
			conflict: 'error',
			returnChanges: true
		}).run(this.conn);
	}

	async updateUser(name: string, patch: Object): Promise<any> {
		const result = await this.table.getAll(name, { index: 'name' }).update(patch).run(this.conn);
		return result;
	}

	async deleteUser(name: string): Promise<any> {
		return this.table.getAll(name, { index: 'name' }).delete().run(this.conn);
	}
}