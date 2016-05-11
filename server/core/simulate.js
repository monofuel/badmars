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
};

function planetTick() {

	db.planet.listNames().then((names) => {
		for (var name of names) {

			//NOTICE
			//this is shoddy and generally a terrible idea.
			//but it works, and allows for multiple instances running this to not step over each other for now.
			//this was probably done in completely the wrong way.
			//the updating of this value 'kicks off' the entire system, and starts unit simulation.

			db.planet.getPlanet(name).then((planet) => {
				if ((new Date()).getTime() - planet.lastTickTimestamp > 1000 / env.ticksPerSec) {
					planet.lastTickTimestamp = (new Date()).getTime();
					planet.lastTick++;
					return planet.save().then();
				}
			});
		}
	});
}
