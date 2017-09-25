
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as r from 'rethinkdb';
import { createTable, startDBCall, setupPlanet } from './helper';
import Map from '../map/map';

import Logger from '../util/logger';
import Context from '../util/context';

export default class DBMap {
	mapCache: any;
	logger: Logger;
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.mapCache = {};
		this.tableName = 'map';
	}

	async init(conn: r.Connection, logger: Logger): Promise<void> {
		this.conn = conn;
		this.logger = logger;
		this.table = r.table(this.tableName);

	}

	async setup(conn: r.Connection, logger: Logger): Promise<void> {
		this.conn = conn;
		this.logger = logger;
		this.table = await createTable(conn, logger, this.tableName, 'name');
	}

	async listNames(): Promise<Array<string>> {
		return await (this.table as any).getField('name').coerceTo('array').run(this.conn);
	}

	async getMap(ctx: Context, name: string, opts?: any): Promise<Map> {
		const { ignoreCache } = opts || { ignoreCache: false };
		const call = await startDBCall(ctx,'getMap');
		if(!ignoreCache && this.mapCache[name] /*&& Date.now() - mapCache[name].lastUpdate < 2000*/ ) {
			ctx.logger.addSumStat('mapCacheHit', 1);
			await call.end();
			return this.mapCache[name].map;
		} else {
			ctx.logger.addSumStat('mapCacheMissOrRefresh', 1);
		}

		const doc = await this.table.get(name).run(this.conn);
		if(!doc) {
			throw new Error('map missing');
		}
		const map = new Map();
		map.clone(doc);
		this.mapCache[name] = {
			lastUpdate: Date.now(),
			map: map
		};

		await call.end();
		return map;
	}

	async registerListener(name: string, func: Function): Promise<void> {
		this.table.get(name).changes().run(this.conn).then((cursor: any): any => {
			cursor.each(func);
		});
	}

	async saveMap(map: Map): Promise<any> {
		return this.table.get(map.name).update(map).run(this.conn);
	}
	async createMap(map: Map): Promise<Object> {
		return this.table.insert(map, { conflict: 'error' }).run(this.conn);
	}

	async updateMap(name: string, patch: Object): Promise<any> {
		return await this.table.get(name).update(patch).run(this.conn);
	}

	async removeMap(name: string): Promise<any> {
		return this.table.get(name).delete().run(this.conn);
	}

	async createRandomMap(name: string): Promise<Object> {
		const planet = await this.createMap(new Map(name));
		await setupPlanet(this.conn, this.logger, name);
		return planet;
	}
}