//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var fs = require('fs');

var unitStats = JSON.parse(fs.readFileSync('config/units.json'));

fs.watchFile("config/units.json", () => {
	console.log('units.json updated, reloading');
	fs.readFile('config/units.json', (err,data) => {
		unitStats = JSON.parse(data);
	});
});

class Unit {
	constructor(unitType, mapName) {

		this.type = unitType;
		//uuid is set by DB
		this.lastTick = 0;
		this.chunkHash = "";

		this.map = mapName;

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
		this.oil = 0;

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
	}

}

module.exports = Unit;
