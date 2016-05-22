//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var fs = require('fs');

var simplePath = require('../nav/simplepath.js');
var astarpath = require('../nav/astarpath.js');

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
		this.chunkHash = this.chunkX + ":" + this.chunkY;
		this.tileHash = x +":" + y;


		this.constructing = 0;
		this.ghosting = false;
		this.ghostCreation = 0;
		this.fireCooldown = 0;

		this.owner = "";

		var stats = unitStats[unitType];
		for (let key in stats) {
			this[key] = stats[key];
		}
		this.health = this.maxHealth || 0;
		this.iron = 0;
		this.fuel = 0;

		this.factoryQueue = [];
		this.resourceCooldown = 0;

	}

	save() {
		return db.unit.saveUnit(this);
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
