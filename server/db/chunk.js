/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import Logger from '../util/logger';
import Chunk from '../map/chunk';

class DBChunk {
	conn: any;
	mapName: string;
	table: any;
	constructor(connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
	}

	init() {
		var tableName = this.mapName + "_chunk";
		var self = this;

		return r.tableList().run(self.conn)
			.then((tableList) => {
				if(tableList.indexOf(tableName) == -1) {
					console.log('creating chunk table for ' + this.mapName);
					return r.tableCreate(tableName, {
						primaryKey: 'hash'
					}).run(self.conn);
				}
			}).then(() => {
				self.table = r.table(tableName);
			});
	}

	list() {
		let profile = Logger.startProfile('listChunks');
		return this.table.coerceTo('array').run(this.conn).then((array) => {
			Logger.endProfile(profile);
			return array;
		});
	}

	async each(func) {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err, doc) => {
			if(err) {
				throw err;
			}
			var chunk = new Chunk();
			chunk.clone(chunk);
			func(chunk);
		}).catch((err) => {
			//dumb rethinkdb bug
			if(err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});
	}

	getChunk(x, y) {
		return this.table.get(x + ":" + y).run(this.conn).then((doc) => {
			if(!doc) {
				return null;
			}
			var chunk = new Chunk();
			chunk.clone(doc);
			return chunk;
		});
	}
	async update(hash: ChunkHash, patch: any): Promise < Object > {
		return this.table.get(hash).update(patch, { returnChanges: true }).run(this.conn);
	}

	saveChunk(chunk) {
		return this.table.insert(chunk, { conflict: "replace" }).run(this.conn);
	}

	async setUnit(chunk: Chunk, uuid: UUID, tileHash: TileHash): Promise < Success > {
		return this.setEntity(chunk, uuid, 'units', tileHash);
	}

	async setResource(chunk: Chunk, uuid: UUID, tileHash: TileHash): Promise < Success > {
		return this.setEntity(chunk, uuid, 'resources', tileHash);
	}

	//update a specific entity location for a specific layer
	//note: layers must have different names than other values on chunk for now
	async setEntity(chunk: Chunk, uuid: UUID, layer: string, tileHash: TileHash): Promise < Success > {

		let entityUpdate = {};
		entityUpdate[tileHash] = uuid; //copy to save to DB
		// $FlowFixMe: layers should probably be in their own map that won't conflict
		chunk[layer][tileHash] = uuid; //update the chunk we were given without doing a chunk.refresh()

		//set the unit in the unit map in the DB without clobbering existing values.
		//if the tileHash key is already set, that means another unit beat us to this
		//location and we will be returning false.
		let mergeObject = {}
		mergeObject[layer] = entityUpdate;
		const delta = await this.table.get(chunk.hash).update((self) => {
			return r.branch(
				self(layer).hasFields(tileHash), {},
				self.merge(mergeObject)
			)
		}, { returnChanges: true }).run(this.conn);

		//if the update was successful, then the unit is successfully set at the location
		if(delta.replaced === 1) {
			return true;
		}
		//otherwise, it's possible that the unit was already at this location
		//fetch the latest copy and check it
		await chunk.refresh();
		// $FlowFixMe: layers should probably be in their own map that won't conflict
		const layerList: Object = chunk[layer];
		if(layerList[tileHash] === uuid) {
			return true;
		}
		return false;
	}

	//these should never get used.
	getTable() {
		return this.table;
	}
	getConn() {
		return this.conn;
	}
}


module.exports = DBChunk;
