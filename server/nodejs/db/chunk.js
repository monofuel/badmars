/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import Context from 'node-context';
import {safeCreateTable, startDBCall} from './helper';

export default class DBChunk {
	conn: r.Connection;
	mapName: string;
	table: r.Table;
	tableName: string;
	constructor(connection: r.Connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = this.mapName + '_chunk';
	}

	async init(): Promise<void> {
		this.table = await safeCreateTable(this.conn, this.tableName, 'hash');
	}

	async each(func: Function): Promise<void> {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err: Error, doc: Object) => {
			if (err) {
				throw err;
			}
			const chunk = new Chunk();
			chunk.clone(doc);
			func(chunk);
		}).catch((err: Error) => {
			//dumb rethinkdb bug
			if (err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});
	}

	async getChunk(ctx: Context, x: number, y: number): Promise<?Chunk> {
		const call = await startDBCall(ctx,'getChunk');
		const doc = await this.table.get(x + ':' + y).run(this.conn);
		await call.end();
		if (!doc) {
			return null;
		}
		const chunk = new Chunk();
		chunk.clone(doc);
		return chunk;
	}
	async update(ctx: Context, hash: ChunkHash, patch: any): Promise<Object> {
		const call = await startDBCall(ctx,'updateChunk');
		const result = await this.table.get(hash).update(patch, { returnChanges: true }).run(this.conn);
		await call.end();
		return result;
	}

	async saveChunk(ctx: Context, chunk: Chunk): Promise<void> {
		const call = await startDBCall(ctx,'saveChunk');
		await this.table.insert(chunk, { conflict: 'replace' }).run(this.conn);
		await call.end();
	}

	async setUnit(ctx: Context, chunk: Chunk, uuid: UUID, tileHash: TileHash): Promise<Success> {
		const call = await startDBCall(ctx,'setUnit');
		const result = await this.setEntity(ctx, chunk, uuid, 'units', tileHash);
		await call.end();
		return result;
	}

	async setResource(ctx: Context, chunk: Chunk, uuid: UUID, tileHash: TileHash): Promise<Success> {
		const call = await startDBCall(ctx,'setResource');
		const result = await this.setEntity(ctx, chunk, uuid, 'resources', tileHash);
		await call.end();
		return result;
	}

	//update a specific entity location for a specific layer
	//note: layers must have different names than other values on chunk for now
	async setEntity(ctx: Context, chunk: Chunk, uuid: UUID, layer: string, tileHash: TileHash): Promise<Success> {

		const entityUpdate = {};
		entityUpdate[tileHash] = uuid; //copy to save to DB
		// $FlowFixMe: layers should probably be in their own map that won't conflict
		chunk[layer][tileHash] = uuid; //update the chunk we were given without doing a chunk.refresh()

		//set the unit in the unit map in the DB without clobbering existing values.
		//if the tileHash key is already set, that means another unit beat us to this
		//location and we will be returning false.
		const mergeObject = {};
		mergeObject[layer] = entityUpdate;
		const delta = await this.table.get(chunk.hash).update((self: any): any => {
			return r.branch(
				self(layer).hasFields(tileHash), {},
				self.merge(mergeObject)
			);
		}, { returnChanges: true }).run(this.conn);

		//if the update was successful, then the unit is successfully set at the location
		if (delta.replaced === 1) {
			return true;
		}
		//otherwise, it's possible that the unit was already at this location
		//fetch the latest copy and check it
		await chunk.refresh(ctx);
		// $FlowFixMe: layers should probably be in their own map that won't conflict
		const layerList: Object = chunk[layer];
		if (layerList[tileHash] === uuid) {
			return true;
		}
		return false;
	}

	//these should never get used.
	getTable(): r.Table {
		return this.table;
	}
	getConn(): r.Connection {
		return this.conn;
	}
}

const Chunk = require('../map/chunk');