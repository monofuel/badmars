//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var Unit = require('../unit/unit.js');
var db = require("./db.js");

class DBUnit {

	constructor(connection, mapName) {
		this.conn = connection;
		this.mapName = mapName;
	}

	init() {
		var tableName = this.mapName + "_unit";
		var self = this;
		//r.tableDrop(tableName).run(self.conn);

		return r.tableList().run(self.conn)
			.then((tableList) => {
				if (tableList.indexOf(tableName) == -1) {
					console.log('creating unit table for ' + self.mapName);
					return r.tableCreate(tableName, {
						primaryKey: 'uuid'
					}).run(self.conn).then(() => {
						console.log("adding tile hash");
						return r.table(tableName).indexCreate("tileHash").run(self.conn);
					}).then(() => {
						console.log("adding chunk hash");
						return r.table(tableName).indexCreate("chunkHash").run(self.conn);
					});
				}
			}).then(() => {
				self.table = r.table(tableName);
			});
	}

	listUnits() {
		return this.table.run(this.conn).then((cursor) => {
			return cursor.toArray();
		});
	}

	addUnit(unit) {
		return this.table.insert(unit, {
			returnChanges: true
		}).run(this.conn).then((delta) => {
			return delta.changes[0].new_val;
		});
	}

	getUnit(uuid) {
		var self = this;
		return this.table.get(uuid).run(this.conn).then((doc) => {
			return self.loadUnit(doc);
		});
	}

	getUnitAtTile(hash) {
		var self = this;
		return this.table.getAll(hash, {
			index: "tileHash"
		}).coerceTo('array').run(this.conn).then((docs) => {
			var doc = docs[0];
			if (docs.length > 1) {
				console.log('error: multiple units at tile');
			}
			if (!doc) {
				return null;
			}
			return self.loadUnit(doc);

		});
	}

	getUnitsAtChunk(x,y) {
		var hash = x + ":" + y;
		var self = this;
		return this.table.getAll(hash, {
			index: "chunkHash"
		}).coerceTo('array').run(this.conn).then((docs) => {
			var units = [];
			var unitPromises = [];
			for (let doc of docs) {
				unitPromises.push(self.loadUnit(doc));
			}
			return Promise.all(unitPromises);

		});
	}

	loadUnit(doc) {
		return db.map.getMap(doc.map).then((map) => {
			var unit = new Unit(doc.type,map,doc.x,doc.y);
			unit.clone(doc);
			return unit;
		});
	}

	getUnprocessedUnit(tick) {
		return this.table.filter(r.row("lastTick").lt(tick), {
			default: true
		}).limit(1).update({
			lastTick: tick
		}, {
			returnChanges: true
		}).run(this.conn).then((delta) => {
			if (!delta.changes || delta.changes.length === 0) {
				return null;
			}
			var newUnit = delta.changes[0].new_val;
			var oldUnit = delta.changes[0].old_val;

			if (newUnit && oldUnit && newUnit.lastTick == oldUnit.lastTick) {
				console.log('tick update fubared');
				return null;
			} else {
				var properUnit = new Unit();
				properUnit.clone(newUnit);
				return properUnit;
			}
		});
	}

	countUnprocessedUnits(tick) {
		return this.table.filter(r.row("lastTick").lt(tick), {
			default: true
		}).count().run(this.conn).then();
	}

	countAllUnits() {
		return this.table.count().run(this.conn);
	}
}


module.exports = DBUnit;
