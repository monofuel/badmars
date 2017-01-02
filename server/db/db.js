/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import helper from '../util/helper';
import r from 'rethinkdb';
import _ from 'lodash';

import DBChunk from './chunk';
import DBUnit from './unit';
import DBUnitStat from './unitStat';

let conn: r.Connection;
import map from './map';
import user from './user';
import chat from './chat';
import event from './event';
const chunks = {};
const units = {};
const unitStats = {};
let logger;


async function init() {
	console.log("DB_INIT");
	logger = require('../util/logger');
	const options: {
		host: string,
		db: string,
		port?: number,
		user?: string,
		password?: string
	} = {
		host: env.dbHost,
		db: env.database,
	};
	if (env.dbPort) {
		options.port = env.dbPort;
	}
	if (env.dbUser) {
		options.user = env.dbUser;
	}
	if (env.dbPassword) {
		options.password = env.dbPassword;
	}
	try {
		conn = await r.connect(options);
	} catch (err) {
		logger.error(err);
		console.log('failed to connect to DB, retrying in 5 seconds');
		await helper.sleep(5000);
		return exports.init();
	}
	const dbList = await r.dbList().run(conn);

	if (dbList.indexOf('badmars') == -1) {
		console.log('creating database');
		await r.dbCreate('badmars').run(conn);
	}

	r.db('badmars');
	//console.log('preparing tables');
	await Promise.all([
		map.init(conn),
		chat.init(conn),
		event.init(conn),
		user.init(conn),
	]);

	const mapNames = await map.listNames();

	//console.log('preparing chunks');
	var chunkPromises = [];
	for (var name of mapNames) {
		var chunk = new DBChunk(conn, name);
		chunkPromises.push(chunk.init());
		this.chunks[name] = chunk;
	}
	await Promise.all(chunkPromises);

	//console.log('preparing units');
	var unitPromises = [];
	for (var name of mapNames) {
		var unit = new DBUnit(conn, name);
		unitPromises.push(unit.init());
		this.units[name] = unit;
	}
	await Promise.all(unitPromises);

	var unitStatPromises = [];
	for (var name of mapNames) {
		var unitStat = new DBUnitStat(conn, name);
		unitStatPromises.push(unitStat.init());
		this.unitStats[name] = unitStat;
	}
	await Promise.all(unitStatPromises);

	await this.map.createRandomMap('testmap');
	//console.log('created map testmap');
};

export async function close() {
	return this.conn.close();
}

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
	async check() {
		logger.checkContext(this.ctx, this.name);
	}
	async end() {
		logger.endProfile(this.profile);
		logger.checkContext(this.ctx, this.name);
	};
}

// rethinkdb does not atomically create tables
// this function does a db-side check for table existance before
// creation, and also adds some jitter
export async function safeCreateTable(tableName: string, primaryKey? :string): r.Table {
	await helper.sleep(5000 * Math.random());
	let results;
	if (primaryKey) {
		results = await r.tableList().contains(tableName).do((exists) => {
			return r.branch(exists, {
				table_created: 0
			}, r.tableCreate(tableName, { primaryKey }))
		}).run(conn);
	} else {
		results = await r.tableList().contains(tableName).do((exists) => {
			return r.branch(exists, {
				table_created: 0
			}, r.tableCreate(tableName))
		}).run(conn);
	}
	if (results.table_created) {
		console.log('created table:' + tableName);
	}
	return r.table(tableName);
}

export async function safeCreateIndex(table: r.Table, name: string, multi?: boolean) {
	const indexList = await table.indexList().run(conn);
	if (multi) {
		if (!indexList.includes(name)) {
			console.log('adding', name, 'index to', table.name);
			await table.indexCreate(name, { multi }).run(conn);
		}
	}
}

export async function clearSpareIndices(table: r.Table, validIndices: Array<string> ) {
	await table.indexWait();
	const indexList = await table.indexList().run(conn);
	const spareIndices = _.remove(indexList, (e) => {
		return !validIndices.includes(e)
	})
	for (let index: string of spareIndices) {
		await table.indexDrop(index).run(conn);
	}
}

export async function startDBCall(ctx: Context, name: string): Promise<DBCall> {
	return new DBCall(ctx, name);
}


export const db = {
	init,
	close,
	map,
	units,
	user,
	chat,
	chunks,
	unitStats,
	event,
};
export default db;
