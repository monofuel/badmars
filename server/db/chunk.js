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

	getChunk(hash) {
		return this.table.get(hash).run(conn).then((doc) => {
			var chunk = new Chunk();
			chunk.clone(doc);
			return chunk;
		});
	}


}


module.exports = DBChunk;
