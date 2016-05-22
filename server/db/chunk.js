//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var Chunk = require('../map/chunk.js');

class DBChunk {

	constructor(connection, mapName) {
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
	listChunks() {
		return this.table.run(this.conn).then((cursor) => {
			return cursor.toArray();
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

	saveChunk(chunk) {
		return this.table.insert(chunk,{conflict:"replace"}).run(this.conn);
	}


}


module.exports = DBChunk;