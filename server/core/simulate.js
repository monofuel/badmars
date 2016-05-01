//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

exports.init = () => {
	setInterval(planetTick, 1000 / env.ticksPerSec);
}

function planetTick() {

	db.planet.listNames().then((names) => {
		for (var name of names) {
			db.planet.getPlanet(name).then((planet) => {
				planet.lastTickTimestamp = (new Date).getTime();
				planet.lastTick++;
				return planet.save().then();
			})
		}
	})
}
