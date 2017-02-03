/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import {safeCreateTable} from './helper';
import type User from '../user/user';

class DBChat {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'chat';
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = await safeCreateTable(conn, this.tableName);
	}

	async watchChat(func: Function): Promise<void> {
		this.table.changes().run(this.conn).then((cursor: any) => {
			cursor.each(func);
		});
	}

	async sendChat(user: User, text: string, channel: string): Promise<void> {
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
