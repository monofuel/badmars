//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');

class Planet {
	constructor(planetName,mapName) {
		this.name = planetName;
		this.settings = {};
		this.mapName = mapName;
		this.lastTickTimestamp = (new Date()).getTime();
		this.lastTick = 0;
	}

	save() {
		return db.planet.savePlanet(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}

}

function getMap(mapName) {
	return db.map.getMap(mapname);
}

module.exports = Planet;
