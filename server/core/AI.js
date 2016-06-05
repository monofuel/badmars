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


	return registerListeners().then(() => {
		return db.map.listNames();
	}).then((names) => {
		var mapPromises = [];
		for (let name of names) {
			mapPromises.push(db.map.getMap(name));
		}
		return Promise.all(mapPromises);
	}).then((maps) => {
		for (let map of maps) {
			process(map.name, map.lastTick);
		}
	});


};

function registerListeners() {
	return db.map.listNames().then((name) => {
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
		//TODO remove listener
		return;
	}

	process(delta.new_val.name,delta.new_val.lastTick);
}

function process(mapName, lastTick) {
	return db.units[mapName].getUnprocessedUnits(lastTick)
	.then((units) => {
		if (units.length > 0) {
			for (let unit of units) {
				processUnit(unit);
			}
			console.log('processed units: ' + units.length);
			return process(mapName, lastTick);
		} else {
			console.log('all units processed for tick');
		}
	});
}

function processUnit(unit) {
	logger.addSumStat('unit_AI',1);
	if (unit.simulate()) {
		unit.save();
	}
}
