/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import _ from 'lodash';

import MonoContext from '../util/monoContext';
import type Logger from '../util/logger';
import { checkContext } from '../util/logger';

class DBCall {
	profile: ProfileKey;
	name: string;
	ctx: MonoContext;
	constructor(ctx: MonoContext, name: string) {
		this.ctx = ctx;
		this.name = name;
		this.profile = ctx.logger.startProfile(this.name);
		checkContext(this.ctx, this.name);
	}
	async check(): Promise<void> {
		checkContext(this.ctx, this.name);
	}
	async end(visible?: boolean): Promise<void> {
		this.ctx.logger.endProfile(this.profile, visible);
		checkContext(this.ctx, this.name);
	}
}

export async function createTable(conn: r.Connection, logger: Logger, tableName: string, primaryKey?: string): r.Table {
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
		logger.info(null, 'created table:' + tableName);
	}
	return r.table(tableName);
}

export async function createIndex(conn: r.Connection, logger: Logger, table: r.Table, name: string, multi?: boolean): Promise<void> {
	const indexList = await table.indexList().run(conn);
	if (multi) {
		if (!indexList.includes(name)) {
			logger.info(null, 'adding ' + name + ' index');
			await table.indexCreate(name, { multi }).run(conn);
		}
	} else {
		if (!indexList.includes(name)) {
			logger.info(null, 'adding ' + name + ' index');
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

export function startDBCall(ctx: MonoContext, name: string): DBCall {
	checkContext(ctx, `startDBCall ${name}`);
	return new DBCall(ctx, name);
}
