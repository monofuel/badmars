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
	return db.map.listNames().then((names) => {
		for (let name of names) {
			if (registeredMaps.indexOf(name) === -1) {
				registeredMaps.push(name);
				db.map.registerListener(name,mapUpdate);
				console.log('registering for ' + name);
			}
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

async function process(mapName, lastTick) {
	return db.units[mapName].getUnprocessedUnits(lastTick)
	.then((units) => {
		if (units.length > 0) {
			var processPromises = [];
			for (let unit of units) {
				processPromises.push(processUnit(unit));
			}
			return Promise.all(processPromises).then(() => {
				console.log('processed units: ' + units.length);
				return process(mapName, lastTick);
			});
		} else {
			//console.log('all units processed for tick');
			setTimeout(() => {
				db.map.getMap(mapName).then((map) => {
					if (map.lastTick === lastTick) {
						return process(mapName,lastTick);
					} else {
					}
				});
			},100);
		}
	});
}

function processUnit(unit) {
	logger.addSumStat('unit_AI',1);
	return unit.simulate().then((update) => {
		if (update) {
			if (!unit.awake) {
				console.log('SLEEPING UNIT');
			}
			unit.updateUnit({
				awake: unit.awake
			});
		}
	});
}
