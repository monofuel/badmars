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
import { setupPlanet } from './helper';
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

	async connect(): Promise<void> {
		const options: {
			host: string,
			db: string,
			port?: number,
			user?: string,
			password?: string
		} =
			{
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
			this.logger.trackError(null, new WrappedError(err, 'failed to connect to DB, retrying in 5 seconds'));
			await sleep(5000);
			return this.init();
		}
	}

	async init(): Promise<void> {
		await this.connect();
		const dbList = await r.dbList().run(this.conn);

		if (dbList.indexOf('badmars') == -1) {
			throw new Error('database "badmars" not ready');
		}

		r.db('badmars');

		try {
			await this.map.init(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize map table');
		}

		try {
			await this.chat.init(this.conn);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize chat table');
		}

		try {
			await this.event.init(this.conn);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize event table');
		}

		try {
			await this.user.init(this.conn);
		} catch (err) {
			throw new WrappedError(err, 'failed to initialize user table');
		}

		const mapNames = await this.map.listNames();

		const chunkPromises = [];
		for (const name of mapNames) {
			const chunk = new DBChunk(this.conn, name);
			chunkPromises.push(chunk.init());
			this.chunks[name] = chunk;
		}
		await Promise.all(chunkPromises);

		const unitPromises = [];
		for (const name of mapNames) {
			const unit = new DBUnit(this.conn, this.logger, name);
			unitPromises.push(unit.init());
			this.units[name] = unit;
		}
		await Promise.all(unitPromises);

		const unitStatPromises = [];
		for (const name of mapNames) {
			const unitStat = new DBUnitStat(this.conn, this.logger, name);
			unitStatPromises.push(unitStat.init());
			this.unitStats[name] = unitStat;
		}
		await Promise.all(unitStatPromises);

		//console.log('created map testmap');
		this.logger.info(null, 'INITIALIZED');
	}

	async setupSchema(): Promise<void> {
		await this.connect();
		this.logger.info(null, 'Initializing Schema');

		const dbList = await r.dbList().run(this.conn);

		if (dbList.indexOf('badmars') == -1) {
			this.logger.info(null, 'creating database');
			await r.dbCreate('badmars').run(this.conn);
		}

		r.db('badmars');

		try {
			await this.map.setup(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to setup map table');
		}

		try {
			await this.chat.setup(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to setup chat table');
		}

		try {
			await this.event.setup(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to setup event table');
		}

		try {
			await this.user.setup(this.conn, this.logger);
		} catch (err) {
			throw new WrappedError(err, 'failed to setup user table');
		}
		await this.map.init(this.conn, this.logger);
		await this.map.createRandomMap('testmap');

		const mapNames = await this.map.listNames();
		await Promise.all(mapNames.map((name: string): Promise<void> => setupPlanet(this.conn, this.logger, name)));

		// TODO
		this.logger.info(null, 'Schema Initialized');
	}

	async close(): Promise<void> {
		return this.conn.close();
	}
}