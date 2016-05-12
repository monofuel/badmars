//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var Chunk = require("../map/chunk.js");


class Map {
	constructor(name) {
		this.name = name;
		this.settings = {
			chunkSize: 16,
			waterHeight: 1
		};
		this.seed = Math.random();
	}
	getChunk(x,y) {
		var self = this;
		return db.chunks[this.name].getChunk(x,y).then((chunk) => {
			if (!chunk || !chunk.isValid()) {
				chunk = new Chunk(x,y,self.name);
				return chunk.save().then(() => {
					return chunk;
				});
			} else {
				return chunk;
			}
		});
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
