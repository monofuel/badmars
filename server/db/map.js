/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Map from '../map/map';

import r from 'rethinkdb';
import db from './db';
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

	async init(conn: r.Connection) {
		this.conn = conn;
		this.table = await db.safeCreateTable(this.tableName, 'name');
	};

	async listNames() {
		return table.getField('name').coerceTo('array').run(conn);
	};

	async getMap(ctx: Context, name: string): Promise<?Map> {
		const call = await db.startDBCall(ctx);
		if(this.mapCache[name] /*&& Date.now() - mapCache[name].lastUpdate < 2000*/ ) {
			logger.addSumStat('mapCacheHit', 1);
			await call.end();
			return this.mapCache[name].map;
		} else {
			logger.addSumStat('mapCacheMissOrRefresh', 1);
		}

		let doc = await this.table.get(name).run(this.conn);
		if(!doc) {
			return null;
		}
		var map = new Map();
		map.clone(doc);
		this.mapCache[name] = {
			lastUpdate: Date.now(),
			map: map
		};

		await call.end();
		return map;
	};

	async registerListener(name: string, func: Function) {
		this.table.get(name).changes().run(this.conn).then((cursor) => {
			cursor.each(func);
		});
	};

	async listNames() {
		return this.table.getField('name').run(this.conn).then((cursor) => {
			return cursor.toArray();
		});
	};

	async saveMap(map: Map) {
		return this.table.get(map.name).update(map).run(this.conn);
	};
	async createMap(map: Map) {
		return this.table.insert(map, { conflict: "error" }).run(this.conn);
	};

	async updateMap(name: string, patch: Object) {
		return await this.table.get(name).update(patch).run(this.conn);
	};

	async removeMap(name: string) {
		return this.table.get(name).delete().run(this.conn);
	};

	async createRandomMap(name: string) {
		return exports.createMap(new Map(name));
	};
}

const map = new Map();
export default map;
