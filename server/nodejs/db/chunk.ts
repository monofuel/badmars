
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as r from 'rethinkdb';
import { createTable, startDBCall } from './helper';
import { checkContext, DetailedError } from '../util/logger';
import Chunk from '../map/chunk';

import Logger from '../util/logger';
import Context from '../util/context';

type UUID = string;
type TileHash = string;
type ChunkHash = string;

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
		this.table = r.table(this.tableName);
	}

	async setup(logger: Logger): Promise<void> {
		this.table = await createTable(this.conn, logger, this.tableName, 'hash');
	}

	async each(func: Function): Promise<void> {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err: Error, doc: any) => {
			if (err) {
				throw err;
			}
			const chunk = new Chunk(this.mapName, doc.x, doc.y);
			chunk.clone(doc);
			func(chunk);
		})
	}

	async getChunk(ctx: Context, x: number, y: number): Promise<Chunk> {
		const call = await startDBCall(ctx, 'getChunk');
		const doc = await this.table.get(x + ':' + y).run(this.conn);
		await call.end();
		if (!doc) {
			return null;
		}
		const chunk = new Chunk(this.mapName, x, y);
		chunk.clone(doc);
		return chunk;
	}

	/*
	* only pluck the entity related fields from the chunk
	* since we currently assume the map does not change
	* this is mainly used by chunk.refresh
	*/
	async getChunkUnits(ctx: Context, x: number, y: number): Promise<Object> {
		const call = await startDBCall(ctx, 'getChunkUnits');
		const doc = await this.table.get(x + ':' + y).pluck('airUnits', 'resources', 'units').run(this.conn);
		await call.end();
		if (!doc) {
			throw new DetailedError('no chunk returned in getChunkUnits');
		}
		return doc;
	}

	// only for single-tile units right now
	async findChunkForUnit(ctx: Context, uuid: UUID): Promise<ChunkHash> {
		const call = await startDBCall(ctx, 'getChunkUnits');
		const cursor = await this.table.filter((chunk: any): any => {
			return chunk('units').values().contains(uuid);
		}).pluck('hash').run(this.conn);
		const docs = await cursor.toArray();
		await call.end();
		if (docs.length === 0) {
			throw new DetailedError('unit not found on map', { uuid });
		} else if (docs.length === 1) {
			return docs[0].hash;
		} else {
			throw new DetailedError('unit found on multiple chunks', { uuid, docs: JSON.stringify(docs) });
		}
	}

	async update(ctx: Context, hash: ChunkHash, patch: any): Promise<Object> {
		const call = await startDBCall(ctx, 'updateChunk');
		const result = await this.table.get(hash).update(patch, { returnChanges: true }).run(this.conn);
		await call.end();
		return result;
	}

	async saveChunk(ctx: Context, chunk: Chunk): Promise<void> {
		const call = await startDBCall(ctx, 'saveChunk');
		await this.table.insert(chunk, { conflict: 'replace' }).run(this.conn);
		await call.end();
	}

	async setUnit(ctx: Context, chunk: Chunk, uuid: UUID, tileHash: TileHash): Promise<void> {
		const call = await startDBCall(ctx, 'setUnit');
		await this.setEntity(ctx, chunk, uuid, 'units', tileHash);
		await call.end();
	}

	async setResource(ctx: Context, chunk: Chunk, uuid: UUID, tileHash: TileHash): Promise<void> {
		const call = await startDBCall(ctx, 'setResource');
		await this.setEntity(ctx, chunk, uuid, 'resources', tileHash);
		await call.end();
	}

	//update a specific entity location for a specific layer
	//note: layers must have different names than other values on chunk for now
	async setEntity(ctx: Context, chunk: Chunk, uuid: UUID, layer: string, tileHash: TileHash): Promise<void> {
		checkContext(ctx, 'setEntity');
		const entityUpdate: any = {};
		entityUpdate[tileHash] = uuid; //copy to save to DB
		// $FlowFixMe: layers should probably be in their own map that won't conflict
		(chunk as any)[layer][tileHash] = uuid; //update the chunk we were given without doing a chunk.refresh()

		//set the unit in the unit map in the DB without clobbering existing values.
		//if the tileHash key is already set, that means another unit beat us to this
		//location and we will be returning false.
		const mergeObject: any = {};
		mergeObject[layer] = entityUpdate;
		const delta = await this.table.get(chunk.hash).update((self: any): any => {
			return r.branch(
				self(layer).hasFields(tileHash), {} as any,
				self.merge(mergeObject)
			);
		}, { returnChanges: true }).run(this.conn);

		//if the update was successful, then the unit is successfully set at the location
		if (delta.replaced === 1) {
			return;
		}
		//otherwise, it's possible that the unit was already at this location
		//fetch the latest copy and check it
		// TODO update this
		// await chunk.refresh(ctx);
		// $FlowFixMe: layers should probably be in their own map that won't conflict
		const layerList: any = (chunk as any)[layer];
		if (layerList[tileHash] === uuid) {
			return;
		}
		throw new DetailedError('failed to set entity at tile', { uuid, found: layerList[tileHash] });
	}

	//these should never get used.
	getTable(): r.Table {
		return this.table;
	}
	getConn(): r.Connection {
		return this.conn;
	}
}
