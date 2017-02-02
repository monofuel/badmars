/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Chunk from '../../map/chunk';
import r from 'rethinkdb';
import Context from 'node-context';
import winston from 'winston';
import cache from 'memory-cache';

import { checkContext } from '../../util/contextUtil';
import { safeCreateTable, startDBCall } from './util';

type ChunkListenerType = (err: Error, cursor: r.Cursor, chunk: Chunk) => Promise<void>;

export default class RethinkChunk {
	tableName: string;
	conn: r.Connection;
	table: r.Table;
	mapName: string;
	cacheTTL: number;

	constructor(mapName: string) {
		this.mapName = mapName;
		this.tableName = `${mapName}_chunk`;
		this.cacheTTL = 1;
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = await safeCreateTable(conn, this.tableName, 'hash');
	}

	async each(ctx: Context, func: Function): Promise<void> {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err: Error, doc: Object) => {
			checkContext(ctx, `${this.tableName}.each()`);
			func(this.serialize(doc));
		});
	}

	async get(ctx: Context, name: string, noCache?: boolean): Promise<Chunk> {
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

	async update(ctx: Context, name: string, patch: Chunk): Promise<void> {
		const doc = this.serialize(patch);
		cache.put(`${this.tableName}|${name}`, doc);
		const call = await startDBCall(ctx, this.tableName, 'update');
		await this.table.get(name).update(patch).run(this.conn);
		await call.end();
	}

	async create(ctx: Context, chunk: Chunk): Promise<void> {
		const doc = this.serialize(chunk);
		cache.put(`${this.tableName}|${chunk.hash}`, doc);
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

	async registerListener(name: string, func: ChunkListenerType): Promise<void> {
		const cursor = await this.table.get(name).changes().run(this.conn);
		cursor.each((err: Error, doc: Object): Promise<void> => func(err, cursor, this.deSerialize(doc)));
	}

	serialize(object: Chunk): Object {
		return object;
	}

	deSerialize(object: Object): Chunk{
		const chunk = new Chunk();
		chunk.clone(object);
		return chunk;
	}

}
