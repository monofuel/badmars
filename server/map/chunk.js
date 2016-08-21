//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var db = require('../db/db.js');
var env = require("../config/env.js");
var SimplexNoise = require('simplex-noise');
var _ = require('lodash');
var Alea = require('alea');
var Tiletypes = require('./tiletypes.js');
var Unit = require('../unit/unit.js');
var PlanetLoc = require("./planetloc.js");

class Chunk {
	constructor(x, y, map) {
		this.x = parseInt(x);
		this.y = parseInt(y);
		this.hash = x + ":" + y;
		this.map = map;
		this.grid = []; //grid size should be chunkSize + 1
		this.navGrid = []; //tile size should be chunkSize
		this.chunkSize = 16;
		this.units = {}; //tilehash unit uuid pairs
	}

	//TODO should be refactored neater
	//the old server never actually did world generation and left it to the client.
	async generate() {
		//console.log('generating chunk ' + this.hash);
		var self = this;
	 	let map = await getMap(this.map);

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
					unit = await map.spawnUnitWithoutTileCheck(unit);
					if (!unit) {
						logger.info('failed to spawn iron');
					} else {
						self.units[unit.tileHash[0]] = unit.uuid;
					}

				} else if (resourceAlea() < map.settings.oilChance) {
					//console.log('spawning oil');
					let unit = new Unit('oil', map, x, y);
					unit = await map.spawnUnitWithoutTileCheck(unit);
					if (!unit) {
						logger.info('failed to spawn oil');
					} else {
						self.units[unit.tileHash[0]] = unit.uuid;
					}
				}
			}
		}
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

	async getUnits() {
		//return await db.units[this.map].getUnitsAtChunk(this.x,this.y);

		await this.refresh();
		const unitUuids = _.map(this.units);

		return db.units[this.map].getUnits(unitUuids);
	}

	//returns success
	async moveUnit(unit,newHash) {
		console.log('new hash:',newHash);
		console.log('old hash:',unit.tileHash[0]);
		let table = db.chunks[this.map].getTable();
		let conn = db.chunks[this.map].getConn();
		let mapUpdate = {};
		mapUpdate[unit.tileHash[0]] = null;
		mapUpdate[newHash] = unit.uuid;
		let delta = await table.get(this.hash).update((self) => {
			return r.branch(
				self('units').hasFields(unit.tileHash[0]),
				{},
				self.merge({units:mapUpdate}).without({units: unit.tileHash[0]})
			)
		},{returnChanges:true}).run(conn);
		return delta.replaced == 1;
	}

	addUnit(uuid,tileHash) {
		let table = db.chunks[this.map].getTable();
		let conn =  db.chunks[this.map].getConn();
		let mapUpdate = {
			tileHash:uuid
		};
		return table.get(this.hash).merge(tileHash).run(conn);
	}

	clone(object) {
		for (let key in object) {
			this[key] = _.cloneDeep(object[key]);
		}
		this.x = parseInt(this.x);
		this.y = parseInt(this.y);
	}

	async refresh() {
		const map = await this.getMap();
		const fresh = await map.getChunk(this.x,this.y);
		this.clone(fresh);
	}

	async getMap() {
		return db.map.getMap(this.map);
	}

	getTiles() {
		//TODO caching system
		var tiles = [];
		for (let i = 0; i < this.chunkSize; i++) {
			for (let j = 0; j < this.chunkSize; j++) {
				var x = i + (this.x * this.chunkSize);
				var y = j + (this.y * this.chunkSize);
				tiles.push(new PlanetLoc(this.map,this,x,y));
			}
		}
		return Promise.resolve(tiles);
	}
}

function getMap(mapName) {
	return db.map.getMap(mapName);
}

module.exports = Chunk;
