//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var Unit = require('../unit/unit.js');

class DBUnit {

	constructor(connection, mapName) {
		this.conn = connection;
		this.mapName = mapName;
	}

	init() {
		var tableName = this.mapName + "_unit";
		var self = this;

		return r.tableList().run(self.conn)
			.then((tableList) => {
				if (tableList.indexOf(tableName) == -1) {
					console.log('creating unit table for ' + this.mapName);
					return r.tableCreate(tableName, {
						primaryKey: 'uuid'
					}).run(self.conn);
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
		return this.table.insert(unit,{returnChanges: true}).run(this.conn).then((delta) => {
			return delta.changes[0].new_val;
		});
	}

	getUnit(uuid) {
		return this.table.get(uuid).run(this.conn).then((doc) => {
			var unit = new Unit();
			unit.clone(doc);
			return unit;
		});
	}

	getUnprocessedUnit(tick) {

		return this.table.filter(r.row("lastTick").lt(tick),{default: true}).limit(1).update({lastTick: tick},{returnChanges: true}).run(this.conn).then((delta) => {
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


}


module.exports = DBUnit;
