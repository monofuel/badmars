
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as r from 'rethinkdb';
import * as _ from 'lodash';

import Context from '../util/context';
import Logger from '../util/logger';
import { checkContext } from '../util/logger';

import DBChunk from './chunk';
import DBUnit from './unit';
import DBUnitStat from './unitStat';

type ProfileKey = string;

class DBCall {
	profile: ProfileKey;
	name: string;
	ctx: Context;
	constructor(ctx: Context, name: string) {
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

export async function createTable(conn: r.Connection, logger: Logger, tableName: string, primaryKey?: string): Promise<r.Table> {
	let results;
	if (primaryKey) {
		results = await (r as any).tableList().contains(tableName).do((exists: boolean): any => {
			return r.branch(exists as any, {
				table_created: 0
			}as any, (r as any).tableCreate(tableName, { primaryKey }));
		}).run(conn);
	} else {
		results = await (r as any).tableList().contains(tableName).do((exists: boolean): any => {
			return r.branch(exists as any, {
				table_created: 0
			} as any, (r as any).tableCreate(tableName));
		}).run(conn);
	}
	if (results.table_created) {
		logger.info(null, 'created table:' + tableName);
	}
	return r.table(tableName);
}

export async function createIndex(conn: r.Connection, logger: Logger, table: r.Table, name: string, multi?: boolean): Promise<void> {
	const indexList: any = await table.indexList().run(conn);
	if (multi) {
		if (!indexList.includes(name)) {
			logger.info(null, 'adding ' + name + ' index');
			await table.indexCreate(name, { multi } as any).run(conn);
		}
	} else {
		if (!indexList.includes(name)) {
			logger.info(null, 'adding ' + name + ' index');
			await table.indexCreate(name).run(conn);
		}
	}
}

export async function clearSpareIndices(conn: r.Connection, table: r.Table, validIndices: Array<string>): Promise<void> {
	await (table as any).indexWait();
	const indexList: Array<string> = await table.indexList().run(conn);
	const spareIndices = _.remove(indexList, (e: string): boolean => {
		return !validIndices.includes(e);
	});
	for (const index of spareIndices) {
		await table.indexDrop(index).run(conn);
	}
}

export function startDBCall(ctx: Context, name: string): DBCall {
	checkContext(ctx, `startDBCall ${name}`);
	return new DBCall(ctx, name);
}

export async function setupPlanet(conn: r.Connection, logger: Logger, name: string): Promise<any> {
	const chunk = new DBChunk(conn, name);
	const unit = new DBUnit(conn, logger, name);
	const unitStats = new DBUnitStat(conn, logger, name);
	return Promise.all([
		chunk.setup(logger),
		unit.setup(),
		unitStats.setup(),
	]);
}