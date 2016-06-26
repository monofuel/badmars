//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var registeredMaps = [];

let mapTicks = {};

let mapProcessing = {};

let mapProcessMap = {};

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
			mapTicks[map.name] = map.lastTick;
			process(map.name);
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
	mapTicks[delta.new_val.name] = delta.new_val.lastTick;

	process(delta.new_val.name);
}

async function process(mapName) {
	if (mapProcessing[mapName]) {
		console.log('map already being processed');
		if (mapProcessMap[mapName]) {
			console.log('clearing last timeout');
			clearTimeout(mapProcessMap[mapName]);
			mapProcessMap[mapName] = null;
		}
		let timeout = setTimeout(() => {
			process(mapName);
			if (mapProcessMap[mapName] === timeout) {
				console.log('map processed, clearing timeout');
				mapProcessMap[mapName] = null;
			}
		},100);
		mapProcessMap[mapName] = timeout;
	}


	let lastTick = mapTicks[mapName];
	return db.units[mapName].getUnprocessedUnits(lastTick)
	.then((units) => {
		if (units.length > 0) {

			mapProcessing[mapName] = true;
			var processPromises = [];
			for (let unit of units) {
				processPromises.push(processUnit(unit));
			}
			return Promise.all(processPromises).then(() => {
				mapProcessing[mapName] = false;
				console.log('processed units: ' + units.length);
				return process(mapName, lastTick);
			});
		} else {
			//console.log('all units processed for tick');

			setTimeout(() => {
				db.map.getMap(mapName).then((map) => {
					if (map.lastTick === lastTick) {
						console.log('still last tick');
						return process(mapName);
					} else {
						console.log('tick progressed');
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
