/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import {safeCreateTable} from './helper';

import type Logger from '../util/logger';

export default class DBEvent {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'event';
	}

	async init(conn: r.Connection, logger: Logger): Promise<void> {
		this.conn = conn;
		this.table = await safeCreateTable(conn, logger, this.tableName);
	}

	async addEvent(object: Object): Promise<void> {
		if (!this.table) {
			//console.log('event fired before connected to DB:',object);
			return;
		}
		await this.table.insert(object).run(this.conn);
	}

	async watchEvents(func: Function): Promise<void> {
		this.table.changes().run(this.conn).then((cursor: any): any => {
			cursor.each(func);
		});
	}
}
