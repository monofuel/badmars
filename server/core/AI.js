//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var registeredMaps = [];

exports.init = () => {
	setInterval(registerListeners,1000);
};

function registerListeners() {
	db.map.listNames().then((name) => {
		if (registeredMaps.indexOf(name) == -1) {
			registeredMaps.push(name);
			db.map.registerListener(name,mapUpdate);
		}
	});
}

function mapUpdate(err,delta) {
	if (err) {
		logger.error(err);
	}
	if (!delta.new_val) {
		console.log('map deleted: ' + delta.old_val.name);
		return;
	}

	if (!delta.old_val || delta.old_val.lastTick == delta.new_val.lastTick) {
		//value on a planet changed other than tick count, ignore it.
		return;
	}

	process(delta);
}

function process(delta) {
	db.units[delta.new_val.name].getUnprocessedUnit(delta.new_val.lastTick)
	.then((unit) => {
		if (unit) {
			process(delta);
			processUnit(unit);
		}
	});
}

function processUnit(unit) {
	logger.addSumStat('unit_AI',1);
}
