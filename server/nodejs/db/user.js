/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import {createTable, createIndex} from './helper';
import User from '../user/user';
import type Logger from '../util/logger';

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
	}

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


	async getUser(name: string): Promise<User> {
		// TODO refactor this
		return this.table.getAll(name, {
			index: 'name'
		}).coerceTo('array').run(this.conn).then((docs: Array<Object>): ?User => {
			const doc = docs[0];
			if(!doc) {
				return null;
			}
			const user = new User();
			user.clone(doc);
			return user;
		});
	}

	async registerListener(func: Function): Promise<void> {
		const cursor = await this.table.changes().run(this.conn);
		cursor.each(func);
	}

	async createUser(name: string, color: string): Object {
		const user = new User(name, color);
		return this.table.insert(user, {
			conflict: 'error',
			returnChanges: true
		}).run(this.conn);
	}

	async updateUser(name: string, patch: Object): Object {
		const result = await this.table.getAll(name, { index: 'name' }).update(patch).run(this.conn);
		return result;
	}

	async deleteUser(name: string): Promise<void> {
		return this.table.getAll(name, { index: 'name' }).delete().run(this.conn);
	}
}