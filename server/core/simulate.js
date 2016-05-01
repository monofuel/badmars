//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

exports.init = () => {
	setInterval(planetTick, 1000 / (env.ticksPerSec * 4));
}

function planetTick() {

	db.planet.listNames().then((names) => {
		for (var name of names) {
			db.planet.getPlanet(name).then((planet) => {
				if ((new Date()).getTime() - planet.lastTickTimestamp > 1000 / env.ticksPerSec) {
					planet.lastTickTimestamp = (new Date()).getTime();
					planet.lastTick++;
					return planet.save().then();
				}
			})
		}
	})
}
