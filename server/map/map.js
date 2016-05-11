//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');


class Map {
	constructor(name) {
		this.name = name;
		this.water = 1;
		this.settings = {};
		this.seed = Math.random();
	}
	getChunk(hash) {
		return db.chunks[this.name].getChunk(hash);
	}

	save() {
		return db.map.saveMap(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}
}

module.exports = Map;
