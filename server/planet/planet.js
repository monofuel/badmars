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
		this.users = [];
	}

	save() {
		return db.planet.savePlanet(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}
	getChunk(x,y) {
		return getMap(this.mapName).then((map) => {
			return map.getChunk(x,y);
		});
	}

}

function getMap(mapName) {
	return db.map.getMap(mapName);
}

module.exports = Planet;
