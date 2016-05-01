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

	}

}

function getMap(mapName) {
	return db.map.getMap(mapname);
}

module.exports = Planet;
