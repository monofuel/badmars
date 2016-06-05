//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require("../config/env.js");
var SimplexNoise = require('simplex-noise');
var Alea = require('alea');
var Tiletypes = require('./tiletypes.js');
var Unit = require('../unit/unit.js');

class Chunk {
	constructor(x, y, map) {
		this.x = x;
		this.y = y;
		this.hash = x + ":" + y;
		this.map = map;
		this.grid = []; //grid size should be chunkSize + 1
		this.navGrid = []; //tile size should be chunkSize
		this.chunkSize = 16;
	}


	//TODO yes i am already re-writing all the server code, but this should get refactored.
	//the old server never actually did world generation and left it to the client.
	generate() {
		//console.log('generating chunk ' + this.hash);
		var self = this;
		return getMap(this.map).then((map) => {

			var waterFudge = 0.15;
			var smoothness = 4.5;

			var bigNoiseGenerator = new SimplexNoise(new Alea(map.seed));
			var medNoiseGenerator = new SimplexNoise(new Alea(map.seed * 79)); //random prime provided by brian
			var smallNoiseGenerator = new SimplexNoise(new Alea(map.seed * 13)); //random prime provided by kir
			self.chunkSize = map.settings.chunkSize;
			for (let i = 0; i < self.chunkSize + 1; i++) {
				self.grid.push([]);
				let x = (self.x * self.chunkSize) + i;
				for (let j = 0; j < self.chunkSize + 1; j++) {
					let y = (self.y * self.chunkSize) + j;
					//dear god sorry this is so ugly, just porting over the same logic from the last generator that was on the client.
					let height = bigNoiseGenerator.noise2D(x * map.settings.bigNoise, y * map.settings.bigNoise) * map.settings.bigNoiseScale;
					height = height + medNoiseGenerator.noise2D(x * map.settings.medNoise, y * map.settings.medNoise) * map.settings.medNoiseScale;
					height = height + smallNoiseGenerator.noise2D(x * map.settings.smallNoise, y * map.settings.smallNoise) * map.settings.smallNoiseScale;

					if (height - map.settings.waterHeight > -waterFudge && height - map.settings.waterHeight < waterFudge) {
						height = map.settings.waterHeight + waterFudge;
					}
					//@grid[x][y] = Math.round(point * smoothness) / smoothness
					self.grid[i].push(Math.round(height * smoothness) / smoothness);
				}
			}

			//-------------------------------------------------
			//figure out the type of each tile

			for (let i = 0; i < self.chunkSize; i++) {
				self.navGrid.push([]);
				for (let j = 0; j < self.chunkSize; j++) {
					var corners = [
                        self.grid[i][j],
                        self.grid[i + 1][j],
                        self.grid[i][j + 1],
                        self.grid[i + 1][j + 1]
                    ];

					var underwater = 0;
					var avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;

					var type = Tiletypes.LAND;
					for (let k of corners) {
						if (Math.abs(k - avg) > map.settings.cliffDelta) {
							type = Tiletypes.CLIFF;
							break;
						} else if (k < map.settings.waterHeight) {
							underwater++;
						}
					}
					if (underwater == 4) {
						type = Tiletypes.WATER;
					} else if (underwater > 0) {
						type = Tiletypes.COAST;
					}

					self.navGrid[i].push(type);
				}
			}
			//-------------------------------------------------
			//spawn resources
			var resourceAlea = new Alea(map.seed * this.x * this.y);
			for (let i = 0; i < self.chunkSize; i++) {
				let x = (self.x * self.chunkSize) + i;
				for (let j = 0; j < self.chunkSize; j++) {
					let y = (self.y * self.chunkSize) + j;

					if (self.navGrid[i][j] != Tiletypes.LAND) {
						continue;
					}

					if (resourceAlea() < map.settings.ironChance) {
						//console.log('spawning iron');
						let unit = new Unit('iron', map, x, y);
						map.spawnUnit(unit);

					} else if (resourceAlea() < map.settings.oilChance) {
						//console.log('spawning oil');
						let unit = new Unit('oil', map, x, y);
						map.spawnUnit(unit);

					}
				}
			}
		});
	}

	save() {
		var self = this;
		return self.generate().then(() => {
			//console.log('saving chunk');
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

		//while stress testing, always re-generate chunks
		return !env.stressTest;
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
