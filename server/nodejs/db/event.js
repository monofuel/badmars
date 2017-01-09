/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import logger from '../util/logger';
import {safeCreateTable, safeCreateIndex, startDBCall} from './db';

class DBEvent {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'event';
	}

	async init(conn: r.Connection) {
		this.conn = conn;
		this.table = await safeCreateTable(this.tableName);
	}

	async addEvent(object: Object) {
		if (!this.table) {
			//console.log('event fired before connected to DB:',object);
			return;
		}
		await this.table.insert(object).run(this.conn);
	}

	async watchEvents(func: Function) {
		this.table.changes().run(this.conn).then((cursor) => {
			cursor.each(func);
		});
	}
}

module.exports = new DBEvent();
