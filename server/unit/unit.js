//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');

class Unit {
	constructor(unitType) {

		this.type = unitType;
		this.lastTick = 0;
		this.chunkHash = "";
	}

	save() {
		return db.unit.saveUnit(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}

}

module.exports = Unit;
