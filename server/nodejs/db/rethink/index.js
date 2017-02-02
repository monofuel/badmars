/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type Planet from '../../map/map';
import env from '../../config/env';
import winston from 'winston';
import r from 'rethinkdb';

import RethinkPlanet from './planet';
import RethinkChunk from './chunk';

type RethinkOptionsType = {
	host: string,
	db: string,
	port?: number,
	user?: string,
	password?: string
};

type ChunkMapType = {
	[key: string]: RethinkChunk,
};

type RethinkTablesType = {
	planets: RethinkPlanet,
	chunks: ChunkMapType
};

export default class Rethink {

	options: RethinkOptionsType;
	conn: r.Connection;

	tables: RethinkTablesType;

	constructor() {
		this.setOptionsFromEnvironment();
	}
	async init(): Promise<void> {
		do {
			try {
				winston.info('connecting to RethinkDB', { host: this.options.host });
				this.conn = r.connect(this.options);
			} catch (err) {
				winston.error('failed to connect to RethinkDB. retrying', { host: this.options.host });
			}
		} while (!this.conn);

		this.createDB(this.options.db);

		this.tables = {
			planets: new RethinkPlanet(),
			chunks: {}
		};

		await this.tables.planets.init(this.conn);

		//TODO mount winston transport to logging table
	}



	async createDB(name: string): Promise<void> {
		const dbList: Array<string> = await r.dbList().run(this.conn);
		if (!dbList.includes(name)) {
			winston.info('creating database', { name });
			await r.dbCreate(name).run(this.conn);
		}
	}

	async planets(): Promise<RethinkPlanet> {
		this.checkConn();
		return this.tables.planets;
	}

	async chunks(planetName: string): Promise<RethinkChunk> {
		this.checkConn();
		if (!this.tables.chunks[planetName]) {
			const chunk = new RethinkChunk(planetName);
			await chunk.init(this.conn);
			this.tables.chunks[planetName] = chunk;
		}

		return this.tables.chunks[planetName];
	}

	checkConn() {
		if (!this.conn) {
			throw new Error('rethinkdb called before connection established');
		}
	}

	setOptionsFromEnvironment() {
		const options: RethinkOptionsType = {
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
	}
}
