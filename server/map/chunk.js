//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var SimplexNoise = require('simplex-noise');

class Chunk {
	constructor(hash,map) {
		this.hash = hash;
		this.map = map;
		this.tiles = [[]];
	}

	save() {
		//TODO
	}

	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}
}

module.exports = Chunk;
