/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import r from 'rethinkdb';
import sleep from 'sleep-promise';
import winston from 'winston';
import _ from 'lodash';

import { checkContext } from '../../util/contextUtil';

// rethinkdb does not atomically create tables
// this function does a db-side check for table existance before
// creation, and also adds some jitter
export async function safeCreateTable(conn: r.Connection, tableName: string, primaryKey?: string): r.Table {
	await sleep(20 * 1000 * Math.random());
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
		winston.info('created table', { tableName });
	}
	return r.table(tableName);
}

export async function safeCreateIndex(conn: r.Connection, table: r.Table, name: string, multi?: boolean): Promise<void> {
	const indexList = await table.indexList().run(conn);
	if (multi) {
		if (!indexList.includes(name)) {
			winston.info('adding index', { name });
			await table.indexCreate(name, { multi }).run(conn);
		}
	} else {
		if (!indexList.includes(name)) {
			winston.info('adding index', { name });
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

export async function startDBCall(ctx: Context, table: string, name: string): Promise<DBCall> {
	if (!ctx) {
		throw new Error('missing context');
	}
	return new DBCall(ctx, table, name);
}


class DBCall {
	profile: string;
	name: string;
	ctx: Context;
	constructor(ctx: Context, table: string, name: string) {
		this.ctx = ctx;
		this.name = name;
		this.profile = `${table}.${name}(${ctx.uuid})`;
		checkContext(this.ctx, this.name);
		winston.profile(this.profile);
	}
	async check(): Promise<void> {
		checkContext(this.ctx, this.name);
	}
	async end(): Promise<void> {
		winston.profile(this.profile);
		checkContext(this.ctx, this.name);
	}
}
