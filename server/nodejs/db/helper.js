/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import helper from '../util/helper';
import r from 'rethinkdb';
import _ from 'lodash';
import Context from 'node-context';
import logger from '../util/logger';

class DBCall {
	profile: ProfileKey;
	name: string;
	ctx: Context;
	constructor(ctx: Context, name: string) {
		this.ctx = ctx;
		this.name = name;
		this.profile = logger.startProfile(this.name);
		logger.checkContext(this.ctx, this.name);
	}
	async check(): Promise<void> {
		logger.checkContext(this.ctx, this.name);
	}
	async end(): Promise<void> {
		logger.endProfile(this.profile);
		logger.checkContext(this.ctx, this.name);
	}
}

// rethinkdb does not atomically create tables
// this function does a db-side check for table existance before
// creation, and also adds some jitter
export async function safeCreateTable(conn: r.Connection, tableName: string, primaryKey?: string): r.Table {
	await helper.sleep(20 * 1000 * Math.random());
	let results;
	if (primaryKey) {
		results = await r.tableList().contains(tableName).do((exists: boolean): any => {
			return r.branch(exists, {
				table_created: 0
			}, r.tableCreate(tableName, { primaryKey }));
		}).run(conn);
	} else {
		results = await r.tableList().contains(tableName).do((exists: boolean): any => {
			return r.branch(exists, {
				table_created: 0
			}, r.tableCreate(tableName));
		}).run(conn);
	}
	if (results.table_created) {
		logger.info('created table:' + tableName);
	}
	return r.table(tableName);
}

export async function safeCreateIndex(conn: r.Connection, table: r.Table, name: string, multi?: boolean): Promise<void> {
	const indexList = await table.indexList().run(conn);
	if (multi) {
		if (!indexList.includes(name)) {
			logger.info('adding ' + name + ' index');
			await table.indexCreate(name, { multi }).run(conn);
		}
	} else {
		if (!indexList.includes(name)) {
			logger.info('adding ' + name + ' index');
			await table.indexCreate(name).run(conn);
		}
	}
}

export async function clearSpareIndices(conn: r.Connection, table: r.Table, validIndices: Array<string>): Promise<void> {
	await table.indexWait();
	const indexList: Array<string> = await table.indexList().run(conn);
	const spareIndices = _.remove(indexList, (e: string): boolean => {
		return !validIndices.includes(e);
	});
	for (const index: string of spareIndices) {
		await table.indexDrop(index).run(conn);
	}
}

export function startDBCall(ctx: Context, name: string): DBCall {
	if (!ctx) {
		throw new Error('missing context');
	}
	return new DBCall(ctx, name);
}
