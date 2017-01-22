/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import {safeCreateTable, safeCreateIndex, startDBCall} from './db';
import logger from '../util/logger';
import User from '../user/user';

class DBChat {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'chat';
	}

	async init(conn: r.Connection) {
		this.conn = conn;
		this.table = await safeCreateTable(this.tableName);
	}

	async watchChat(func: Function) {
		this.table.changes().run(this.conn).then((cursor) => {
			cursor.each(func);
		});
	}

	async sendChat(user: User, text: string, channel: string) {
		const object = {
			uuid: user.uuid,
			channel,
			text,
			timestamp: Date.now()
		};

		await this.table.insert(object).run(this.conn);
	}
}

const chat = new DBChat();
export default chat;
