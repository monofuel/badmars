//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require("../config/env.js");
var SimplexNoise = require('simplex-noise');
var Alea = require('alea');

class Chunk {
	constructor(x,y,map) {
		this.x = x;
		this.y = y;
		this.hash = x + ":" + y;
		this.map = map;
		this.grid = []; //grid size should be chunkSize + 1
		this.tiles = []; //tile size should be chunkSize
		this.chunkSize = 16;
	}

	generate() {
		console.log('generating chunk ' + this.hash);
		var self = this;
		return getMap(this.map).then((map) => {
			var random = new Alea(map.seed);
			var simplex = new SimplexNoise(random);
			self.chunkSize = map.settings.chunkSize;
			for (var i = 0; i < self.chunkSize + 1; i++) {
				self.grid.push([]);
				var x = (self.x * self.chunkSize) + i;
				for (var j = 0; j < self.chunkSize + 1; j++) {
					var y = (self.y * self.chunkSize) + j;
					self.grid[i].push(simplex.noise2D(x,y) * 3);
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
		if (this.grid.length != this.chunkSize + 1) {
			return false;
		}
		if (this.grid.length > 0) {
			if (this.grid[0].length != this.chunkSize + 1) {
				return false;
			}
		}

		//TODO check if map chunk size changed

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
