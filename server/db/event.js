/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import db from './db';
import logger from '../util/logger';

class DBEvent {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'event';
	}

	async init(conn: r.Connection) {
		this.conn = conn;
		this.table = await db.safeCreateTable(this.tableName);
	}

	async addEvent(object: Object) {
		await this.table.insert(object).run(this.conn);
	}
}

const event = new DBEvent();
export default event;
