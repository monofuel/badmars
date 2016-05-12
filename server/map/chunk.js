//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require("../config/env.js");
var SimplexNoise = require('simplex-noise');
var Alea = require('alea');

var CHUNK_SIZE = env.chunkSize;

class Chunk {
	constructor(x,y,map) {
		this.x = x;
		this.y = y;
		this.hash = x + ":" + y;
		this.map = map;
		this.grid = []; //grid size should be CHUNK_SIZE + 1
		this.tiles = []; //tile size should be CHUNK_SIZE
	}

	generate() {
		console.log('generating chunk ' + this.hash);
		var self = this;
		return getMap(this.map).then((map) => {
			var random = new Alea(map.seed);
			var simplex = new SimplexNoise(random);
			for (var i = 0; i < CHUNK_SIZE + 1; i++) {
				self.grid.push([]);
				var x = (self.x * CHUNK_SIZE) + i;
				for (var j = 0; j < CHUNK_SIZE + 1; j++) {
					var y = (self.y * CHUNK_SIZE) + j;
					self.grid[i].push(simplex.noise2D(x,y));
				}
			}
		});
	}

	save() {
		var self = this;
		return self.generate().then(() => {
			console.log('saving chunk');
			return db.chunks[self.map].saveChunk(self);
		});
	}

	isValid() {
		if (this.grid.length != CHUNK_SIZE + 1) {
			return false;
		}
		if (this.grid.length > 0) {
			if (this.grid[0].length != CHUNK_SIZE + 1) {
				return false;
			}
		}

		return true;
	}

	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}
}

function getMap(mapName) {
	return db.map.getMap(mapName);
}

module.exports = Chunk;
