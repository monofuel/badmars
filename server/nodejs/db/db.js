/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import r from 'rethinkdb';

import DBMap from './map';
import DBChunk from './chunk';
import DBUnit from './unit';
import DBUnitStat from './unitStat';
import DBUser from './user';
import DBChat from './chat';
import DBEvent from './event';

import { WrappedError } from '../util/logger';

import sleep from '../util/sleep';
import type Logger from '../util/logger';

type ChunkMapType = {
	[key: string]: DBChunk
};
type UnitMapType = {
	[key: string]: DBUnit
};
type UnitStatMapType = {
	[key: string]: DBUnitStat
};

export default class DB {
	logger: Logger;
	conn: r.Connection;

	chunks: ChunkMapType = {};
	units: UnitMapType = {};
	unitStats: UnitStatMapType = {};
	map = new DBMap();
	user = new DBUser();
	chat = new DBChat();
	event = new DBEvent();

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
			await sleep(5000);
			return this.init();
		}
		const dbList = await r.dbList().run(this.conn);

		if (dbList.indexOf('badmars') == -1) {
			this.logger.info(null, 'creating database');
			await r.dbCreate('badmars').run(this.conn);
		}

		r.db('badmars');
		
		try {
			await this.map.init(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize map table');
		}

		try {
			await this.chat.init(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize chat table');
		}
		
		try {
			await this.event.init(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize event table');
		}

		try {
			await this.user.init(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize user table');
		}

		const mapNames = await this.map.listNames();

		const chunkPromises = [];
		for (const name of mapNames) {
			const chunk = new DBChunk(this.conn, name);
			chunkPromises.push(chunk.init(this.logger));
			this.chunks[name] = chunk;
		}
		await Promise.all(chunkPromises);

		const unitPromises = [];
		for (const name of mapNames) {
			const unit = new DBUnit(this.conn, name);
			unitPromises.push(unit.init(this.logger));
			this.units[name] = unit;
		}
		await Promise.all(unitPromises);

		const unitStatPromises = [];
		for (const name of mapNames) {
			const unitStat = new DBUnitStat(this.conn, this.logger, name);
			unitStatPromises.push(unitStat.init(this.logger));
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