//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var Chunk = require("../map/chunk.js");
var PlanetLoc = require("./planetloc.js");

var chunkCache = {};

class Map {
	constructor(name) {
		this.name = name;
		if (name && !chunkCache[name]) {
			chunkCache[name] = {};
		}
		this.settings = {
			chunkSize: 16,
			waterHeight: 6.4,
			cliffDelta: 0.3,
			water: true,
			bigNoise: 0.07,
		    medNoise: 0.24,
		    smallNoise: 0.53,
		    bigNoiseScale: 1.8,
		    medNoiseScale: 0.25,
		    smallNoiseScale: 0.25,
		    ironChance: 0.003,
		    oilChance: 0.002
		};
		this.lastTickTimestamp =  (new Date()).getTime();
		this.lastTick = 0;
		this.users = [];
		this.seed = Math.random();
	}
	getChunk(x,y) {
		var self = this;
		var hash = x + ":" + y;
		if (chunkCache[this.name][hash]) {
			return new Promise((reject,resolve) => {
				resolve(chunkCache[this.name][hash]);
			});
		}
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

	getLoc(x,y) {
		var self = this;
		var chunkX = Math.floor(x / map.settings.chunkSize);
    var chunkY = Math.floor(y / map.settings.chunkSize);
		return getChunk(x,y).then((chunk) => {
			return new PlanetLoc(self,chunk,x,y);
		});
	}

	spawnUnit(newUnit) {
		db.units[this.name].getUnitAtTile(newUnit.tileHash).then((unit) => {
			if (unit) {
				console.log('attempted to spawn unit where unit exists');
				return;
			}
			db.units[this.name].addUnit(newUnit);
		});
	}

	spawnUser(client) {
		//find a spawn location

		//spawn units for them
		var unitPromises = [];

		//return a promise that returns all the units
		return Promise.all(unitPromises);
	}

	save() {
		return db.map.saveMap(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
		this.settings = {
			chunkSize: 16,
			waterHeight: 0,
			cliffDelta: 0.4,
			water: true,
			bigNoise: 0.005,
		    medNoise: 0.04,
		    smallNoise: 0.1,
		    bigNoiseScale: 15,
		    medNoiseScale: 3,
		    smallNoiseScale: 1,
		    ironChance: 0.003,
		    oilChance: 0.002
		};
	}
}

module.exports = Map;
