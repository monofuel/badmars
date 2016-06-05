//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var Unit = require('../unit/unit.js');
var db = require("./db.js");
var env = require('../config/env.js');

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
						console.log("adding tile hash index");
						return r.table(tableName).indexCreate("tileHash").run(self.conn);
					}).then(() => {
						console.log("adding chunk hash index");
						return r.table(tableName).indexCreate("chunkHash").run(self.conn);
					}).then(() => {
						console.log("adding lastTick index");
						return r.table(tableName).indexCreate("lastTick").run(self.conn);
					}).then(() => {
						console.log("adding awake index");
						return r.table(tableName).indexCreate("awake").run(self.conn);
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

	saveUnit(unit) {
		return this.table.get(unit.uuid).update(unit).run(this.conn);
	};

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

	getUnitsAtChunk(x, y) {
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
			var unit = new Unit(doc.type, map, doc.x, doc.y);
			unit.clone(doc);
			return unit;
		});
	}

	//would be nice if i could combine
	//pathlistener and getunprocessed into one step
	//atm pathlistener will trigger a check to fetch unprocessed
	//and unprocessed atomicly picks off a unit
	registerPathListener(listener) {
		return this.table.filter(r.row("destination"))
			.filter(r.row("path"))
			.filter(r.row("isPathing").eq('false'))
			.changes().run(this.conn);
	}

	getUnprocessedPath() {
		return this.table.filter(r.row("destination"))
			.filter(r.row("path"))
			.filter(r.row("isPathing").eq('false'))
			.update({
				isPathing: true,
				pathUpdate: (new Date()).getTime()
			}).run(this.conn);
	}

	getUnprocessedUnits(tick) {
		return this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('lastTick').lt(tick)).limit(env.unitProcessChunks).update({
			lastTick: tick
		}, {
			returnChanges: true
		}).run(this.conn).then((delta) => {
			if (!delta.changes || delta.changes.length === 0) {

				return [];
			}
			var units = [];
			for (let i = 0; i < delta.changes.length; i++) {
				var newUnit = delta.changes[i].new_val;
				var oldUnit = delta.changes[i].old_val;

				var properUnit = new Unit();
				properUnit.clone(newUnit);
				units.push(properUnit);

			}
			return units;
		});
	}

	countUnprocessedUnits(tick) {
		//new units will have lastTick set to 0. we do not want this in the 'unprocessed' count
		//however we still want to process them next tick.
		return this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('lastTick').lt(tick).gt(0)).count().run(this.conn);
	}

	countAllUnits() {
		return this.table.count().run(this.conn);
	}

	countAwakeUnits() {
		return this.table.getAll(true, {
			index: 'awake'
		}).count().run(this.conn);
	}

}


module.exports = DBUnit;
