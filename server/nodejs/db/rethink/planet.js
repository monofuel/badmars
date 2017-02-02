/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Planet from '../../map/map';
import r from 'rethinkdb';
import Context from 'node-context';
import winston from 'winston';
import cache from 'memory-cache';

import { checkContext } from '../../util/contextUtil';
import { safeCreateTable, startDBCall } from './util';

type PlanetListenerType = (err: Error, cursor: r.Cursor, planet: Planet) => Promise<void>;

export default class RethinkPlanet {
	tableName: string;
	conn: r.Connection;
	table: r.Table;
	cacheTTL: number;

	constructor() {
		this.tableName = 'planet';
		this.cacheTTL = 20;
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = await safeCreateTable(conn, this.tableName, 'name');
	}

	async each(ctx: Context, func: Function): Promise<void> {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err: Error, doc: Object) => {
			checkContext(ctx, `${this.tableName}.each()`);
			func(this.serialize(doc));
		});
	}

	async get(ctx: Context, name: string, noCache?: boolean): Promise<Planet> {
		let planet = noCache ? null : cache.get(`${this.tableName}|${name}`);
		if (planet) {
			winston.info(`${this.tableName} cache hit`);
		} else {
			const call = await startDBCall(ctx, this.tableName, 'get');
			planet = await this.table.get(name).run(this.conn);
			await call.end();
		}

		if (!planet) {
			throw new Error(`no such planet ${name}`);
		}
		return this.deSerialize(planet);
	}

	async update(ctx: Context, name: string, patch: Planet): Promise<void> {
		const doc = this.serialize(patch);
		cache.put(`${this.tableName}|${name}`, doc);
		const call = await startDBCall(ctx, this.tableName, 'update');
		await this.table.get(name).update(doc).run(this.conn);
		await call.end();
	}

	async create(ctx: Context, planet: Planet): Promise<void> {
		const doc = this.serialize(planet);
		cache.put(`${this.tableName}|${planet.name}`, doc);
		const call = await startDBCall(ctx, this.tableName, 'create');
		await this.table.insert(doc, { conflict: 'error' }).run(this.conn);
		await call.end();
	}

	async del(ctx: Context, name: string): Promise<void> {
		cache.del(`${this.tableName}|${name}`);
		const call = await startDBCall(ctx, this.tableName, 'delete');
		await this.table.get(name).delete().run(this.conn);
		await call.end();
	}

	async registerListener(name: string, func: PlanetListenerType): Promise<void> {
		const cursor = await this.table.get(name).changes().run(this.conn);
		cursor.each((err: Error, doc: Object): Promise<void> => func(err, cursor, this.deSerialize(doc)));
	}

	serialize(object: Planet): Object {
		return object;
	}

	deSerialize(object: Object): Planet{
		const planet = new Planet();
		planet.clone(object);
		return planet;
	}

}
