/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import r from 'rethinkdb';

import type Logger from '../util/logger';
import type DBChunk from './chunk';
import type DBUnit from './unit';
import type DBUnitStat from './unitStat';

type ChunkMapType = {
	[key: string]: DBChunk
};
type UnitMapType = {
	[key: string]: DBUnit
};
type UnitStatMapType = {
	[key: string]: DBUnitStat
};

const map = require('./map').default;
const user = require('./user').default;
const chat = require('./chat').default;
const event = require('./event');

export default class DB {
	logger: Logger;
	conn: r.Connection;

	chunks: ChunkMapType = {};
	units: UnitMapType = {};
	unitStats: UnitStatMapType = {};
	map = map;
	user = user;
	chat = chat;
	event = event;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async init(): Promise<void> {
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
			this.logger.trackError(null, err, 'failed to connect to DB, retrying in 5 seconds');
			await helper.sleep(5000);
			return this.init();
		}
		const dbList = await r.dbList().run(this.conn);

		if (dbList.indexOf('badmars') == -1) {
			this.logger.info(null, 'creating database');
			await r.dbCreate('badmars').run(this.conn);
		}

		r.db('badmars');
		await Promise.all([
			map.init(this.conn),
			chat.init(this.conn),
			event.init(this.conn),
			user.init(this.conn),
		]);

		const mapNames = await map.listNames();
		
		const DBChunk = require('./chunk');
		const DBUnit = require('./unit').default;
		const DBUnitStat = require('./unitStat').default;

		const chunkPromises = [];
		for (const name of mapNames) {
			const chunk = new DBChunk(this.conn, name);
			chunkPromises.push(chunk.init());
			this.chunks[name] = chunk;
		}
		await Promise.all(chunkPromises);

		const unitPromises = [];
		for (const name of mapNames) {
			const unit = new DBUnit(this.conn, name);
			unitPromises.push(unit.init());
			this.units[name] = unit;
		}
		await Promise.all(unitPromises);

		const unitStatPromises = [];
		for (const name of mapNames) {
			const unitStat = new DBUnitStat(this.conn, name);
			unitStatPromises.push(unitStat.init());
			this.unitStats[name] = unitStat;
		}
		await Promise.all(unitStatPromises);

		await this.map.createRandomMap('testmap');
		//console.log('created map testmap');
		this.logger.info(null, 'INITIALIZED');
	}

	async close(): Promise<void> {
		return this.conn.close();
	}
}