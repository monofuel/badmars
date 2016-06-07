//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var fs = require('fs');

var simplePath = require('../nav/simplepath.js');
var astarpath = require('../nav/astarpath.js');

var groundUnitAI = require('./ai/groundunit.js');
var attackAI = require('./ai/attack.js');
var constructAI = require('./ai/construction.js');
var mineAI = require('./ai/mine.js');

var unitStats = JSON.parse(fs.readFileSync('config/units.json'));

fs.watchFile("config/units.json", () => {
	console.log('units.json updated, reloading');
	fs.readFile('config/units.json', (err,data) => {
		unitStats = JSON.parse(data);
	});
});

class Unit {
	constructor(unitType, map,x,y) {

		this.type = unitType;
		//uuid is set by DB
		if (map && map.settings) {
			this.chunkX = Math.floor(x / map.settings.chunkSize);
			this.chunkY = Math.floor(y / map.settings.chunkSize);
			this.map = map.name;
		}
		this.x = x;
		this.y = y;
		this.lastTick = 0;

		//TODO optimize values stored on units depending on type
		this.constructing = 0;
		this.ghosting = false;
		this.ghostCreation = 0;
		this.fireCooldown = 0;

		this.owner = "";

		var stats = unitStats[unitType];
		for (let key in stats) {
			this[key] = stats[key];
		}

		if (!this.size || this.size === 1) {
			this.chunkHash = [this.chunkX + ":" + this.chunkY];
			this.tileHash = [x +":" + y];
		} else if (this.size === 3) {
			var tiles = [
				map.getloc(x - 1, y - 1), map.getLoc(x,y - 1), map.getLoc(x + 1, y - 1),
				map.getloc(x - 1, y),     map.getLoc(x,y),     map.getLoc(x + 1, y),
				map.getloc(x - 1, y + 1), map.getLoc(x,y + 1), map.getLoc(x + 1, y + 1)
			];
			this.tileHash = [];
			this.chunkHash = [];
			for (let tile of tiles) {
				if (this.tileHash.indexOf(tile.hash) == -1) {
					this.tileHash.push(tile.hash);
				}
				if (this.chunkHash.indexOf(tile.chunk.hash) == -1) {
					this.chunkHash.push(tile.chunk.hash);
				}
			}

		} else {
			console.log('unsupported unit size in config: ' + this.size);
		}


		this.health = this.maxHealth || 0;
		this.iron = 0;
		this.fuel = 0;

		//TODO pathing stuff should probably be stored in it's own table
		this.path = [];
		this.pathAttempts = 0;
		this.isPathing = false;
		this.pathUpdate = 0;

		this.factoryQueue = [];
		this.resourceCooldown = 0;

		this.awake = true;

	}

	simulate() {
		var self = this;
		var update = false;  //only save when there are changes
		self.awake = false; //awake should be updated to true if we need another simulation tick soon

		//either only move, attack or construct. not doing multiple at once.

		return db.map.getMap(this.map).then((map) => {
			var movementPromise = Promise.resolve(false);
			switch (self.movementType) {
				case 'ground':
					movementPromise = groundUnitAI.simulate(self,map);
					break;
			}
			return movementPromise.then((moved) => {
				if (moved) {
					console.log('moved');
					update = true;
					awake = true;
				}
				if (!update && self.attack != 0 && self.range != 0) {
					return attackAI.simulate(self,map);
				}

			}).then((attacked) => {
				if (attacked) {
					console.log('attacking');
					update = true;
					awake = true;
				}
				if (!update && self.construction) {
					return constructionAI.simulate(self,map);
				}

			}).then((constructed) => {
				if (constructed) {
					console.log('constructing');
					update = true;
					awake = true;
				}

				//special one-off AI
				//mines should always be awake
				if (self.type === 'mine') {
					self.awake = true;
					return mineAI.simulate(unit,map);
				}

				if (!update && !self.awake) {
					//if there is no update but the unit will no longer be awake, update to sleep it
					update = true;
				}
				return update;
			});
		});
	}

	save() {
		//TODO
		//bad way to update units. should white-list and apply updates atomicly.

		//TODO
		//remove unit stats from object before saving (or impliment update whitelist)
		return db.units[this.map].saveUnit(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
		var stats = unitStats[this.unitType];
		for (let key in stats) {
			this[key] = stats[key];
		}
	}

}

module.exports = Unit;
