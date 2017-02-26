/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import {safeCreateTable, startDBCall} from './helper';
import logger from '../util/logger';
import Context from 'node-context';

class DBMap {
	mapCache: Object;
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.mapCache = {};
		this.tableName = 'map';
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = await safeCreateTable(conn, this.tableName, 'name');
	}

	async listNames(): Promise<Array<string>> {
		return await this.table.getField('name').coerceTo('array').run(this.conn);
	}

	async getMap(ctx: Context, name: string): Promise<Map> {
		const call = await startDBCall(ctx,'getMap');
		if(this.mapCache[name] /*&& Date.now() - mapCache[name].lastUpdate < 2000*/ ) {
			logger.addSumStat('mapCacheHit', 1);
			await call.end();
			return this.mapCache[name].map;
		} else {
			logger.addSumStat('mapCacheMissOrRefresh', 1);
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

	async saveMap(map: Map): Promise<void> {
		return this.table.get(map.name).update(map).run(this.conn);
	}
	async createMap(map: Map): Promise<Object> {
		return this.table.insert(map, { conflict: 'error' }).run(this.conn);
	}

	async updateMap(name: string, patch: Object): Promise<void> {
		return await this.table.get(name).update(patch).run(this.conn);
	}

	async removeMap(name: string): Promise<void> {
		return this.table.get(name).delete().run(this.conn);
	}

	async createRandomMap(name: string): Promise<Object> {
		return this.createMap(new Map(name));
	}
}

const map = new DBMap();
export default map;

const Map = require('../map/map');