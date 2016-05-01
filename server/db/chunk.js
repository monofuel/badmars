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
					console.log('creating chunk table for ' + mapName);
					return r.tableCreate(tableName, {
						primaryKey: 'chunk_coord'
					}).run(self.conn);
				}
			}).then(() => {
				self.table = r.table(tableName);
			});
	}
}

module.exports = DBChunk;
