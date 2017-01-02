/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import logger from '../util/logger';
import helper from '../util/helper';
import r from 'rethinkdb';
import _ from 'lodash';

import DBMap from './map';
import DBChat from './chat';
import DBEvent from './event';
import DBChunk from './chunk';
import DBUnit from './unit';
import DBUnitStat from './unitStat';

class DB {
	map: any;
	user: any;
	chat: any;
	event: any;
	chunks: Object;
	units: Object;
	unitStats: Object;
	conn: r.Connection;

	constructor() {
		this.map = require('./map');
		this.user = require('./user');
		this.chat = require('./chat');
		this.event = require('./event');
		this.chunks = {};
		this.units = {};
		this.unitStats = {};
	}

	async init() {
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
			this.conn = await r.connect(options);
		} catch (err) {
			logger.error(err);
			console.log('failed to connect to DB, retrying in 5 seconds');
			await helper.sleep(5000);
			return exports.init();
		}
		const dbList = await r.dbList().run(this.conn);

		if (dbList.indexOf('badmars') == -1) {
			console.log('creating database');
			await r.dbCreate('badmars').run(this.conn);
		}

		r.db('badmars');
		//console.log('preparing tables');
		await Promise.all([
			this.map.init(this.conn),
			this.chat.init(this.conn),
			this.event.init(this.conn),
			this.user.init(this.conn),
		]);

		const mapNames = await this.map.listNames();

		//console.log('preparing chunks');
		var chunkPromises = [];
		for (var name of mapNames) {
			var chunk = new DBChunk(this.conn, name);
			chunkPromises.push(chunk.init());
			this.chunks[name] = chunk;
		}
		await Promise.all(chunkPromises);

		//console.log('preparing units');
		var unitPromises = [];
		for (var name of mapNames) {
			var unit = new DBUnit(this.conn, name);
			unitPromises.push(unit.init());
			this.units[name] = unit;
		}
		await Promise.all(unitPromises);

		var unitStatPromises = [];
		for (var name of mapNames) {
			var unitStat = new DBUnitStat(this.conn, name);
			unitStatPromises.push(unitStat.init());
			this.unitStats[name] = unitStat;
		}
		await Promise.all(unitStatPromises);

		await this.map.createRandomMap('testmap');
		//console.log('created map testmap');
	};

	async close() {
		return this.conn.close();
	}

	// rethinkdb does not atomically create tables
	// this function does a db-side check for table existance before
	// creation, and also adds some jitter
	async safeCreateTable(tableName: string, primaryKey:
		?
		string): r.Table {
		await helper.sleep(5000 * Math.random());
		let results;
		if (primaryKey) {
			results = await r.tableList().contains(tableName).do((exists) => {
				return r.branch(exists, {
					table_created: 0
				}, r.tableCreate(tableName, { primaryKey }))
			}).run(this.conn);
		} else {
			results = await r.tableList().contains(tableName).do((exists) => {
				return r.branch(exists, {
					table_created: 0
				}, r.tableCreate(tableName))
			}).run(this.conn);
		}
		if (results.table_created) {
			console.log('created table:' + tableName);
		}
		return r.table(tableName);
	}

	async safeCreateIndex(table: r.Table, name: string, multi:
		?
		boolean) {
		const indexList = await table.indexList().run(self.conn);
		if (multi) {
			if (!indexList.includes(name)) {
				console.log('adding', name, 'index to', table.name);
				await table.indexCreate(name, { multi }).run(self.conn);
			}
		}
	}

	async clearSpareIndices(table: r.Table, validIndices: Array<string> ) {
		await table.indexWait();
		const indexList = await table.indexList().run(self.conn);
		const spareIndices = _.remove(indexList, (e) => {
			return !validIndices.includes(e)
		})
		for (let index: string of spareIndices) {
			await table.indexDrop(index).run(self.conn);
		}
	}

	async startDBCall(ctx: Context, name?: string): Promise<DBCall> {
		return new DBCall(ctx, name);
	}
}

const db = new DB();
export default db;

export class DBCall {
	profile: ProfileKey;
	name: string;
	ctx: Context;
	constructor(ctx: Context, name? :string) {
		this.ctx = ctx;
		if (name) {
			this.name = name;
		} else {
			this.name = arguments.caller.name;
		}
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
