//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var registeredPlanets = [];

exports.init = () => {
	setInterval(registerListeners,1000);
}

function registerListeners() {
	db.planet.listNames().then((name) => {
		if (registeredPlanets.indexOf(name) == -1) {
			registeredPlanets.push(name);
			db.planet.registerListener(name,planetUpdate);
		}
	});
}

function planetUpdate(err,delta) {
	if (err) {
		logger.error(err);
	}
	if (!delta.new_val) {
		console.log('planet deleted: ' + delta.old_val.name);
		return;
	}

	if (!delta.old_val || delta.old_val.lastTick == delta.new_val.lastTick) {
		//value on a planet changed other than tick count, ignore it.
		return;
	}
	//console.log('simulating units for ' + delta.new_val.name);
	//TODO
	//fetch units that need updates
}
