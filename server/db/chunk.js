/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

import r from 'rethinkdb';
import {Chunk} from '../map/chunk.js';

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
				if (tableList.indexOf(tableName) == -1) {
					console.log('creating chunk table for ' + this.mapName);
					return r.tableCreate(tableName, {
						primaryKey: 'hash'
					}).run(self.conn);
				}
			}).then(() => {
				self.table = r.table(tableName);
			});
	}

	async each(func) {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err,doc) => {
			if (err) {
				throw err;
			}
			var chunk = new Chunk();
			chunk.clone(chunk);
			func(chunk);
		});
	}

	getChunk(x,y) {
		return this.table.get(x + ":" + y).run(this.conn).then((doc) => {
			if (!doc) {
				return null;
			}
			var chunk = new Chunk();
			chunk.clone(doc);
			return chunk;
		});
	}
	async update(hash: ChunkHash,patch: any): Promise<Object> {
		return this.table.get(hash).update(patch,{returnChanges:true}).run(this.conn);
	}

	saveChunk(chunk) {
		return this.table.insert(chunk,{conflict:"replace"}).run(this.conn);
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
