/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import User from '../user/user';
import {safeCreateTable, safeCreateIndex} from './db';

class DBUser {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'user';
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = await safeCreateTable(this.tableName,'uuid');
		await safeCreateIndex(this.table, 'name');
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

	async getUser(name: string) {
		return this.table.getAll(name, {
			index: 'name'
		}).coerceTo('array').run(this.conn).then((docs) => {
			var doc = docs[0];
			if(!doc) {
				return null;
			}
			var user = new User();
			user.clone(doc);
			return user;
		});
	}

	async createUser(name: string, color: string) {
		var user = new User(name, color);
		return this.table.insert(user, {
			conflict: 'error',
			returnChanges: true
		}).run(this.conn);
	}

	async updateUser(name: string, patch: Object) {
		const result = await this.table.getAll(name, { index: 'name' }).update(patch).run(this.conn);
		return result;
	}

	async deleteUser(name: string) {
		return this.table.getAll(name, { index: 'name' }).delete().run(this.conn);
	}
}

const user = new DBUser();
export default user;
