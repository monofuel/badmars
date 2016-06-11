//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var registeredMaps = [];

async function init() {
	setInterval(registerListeners,1000);

	await registerListeners();

	let maps = await db.map.listNames();

	for (let mapName of maps) {
		while (await process(mapName));
		//process(mapName);
	}

};
exports.init = init;

function registerListeners() {
	db.map.listNames().then((names) => {
		for (let name of names) {
			if (registeredMaps.indexOf(name) === -1) {
				registeredMaps.push(name);
				db.units[name].registerPathListener(pathfind);
				console.log('registering for ' + name);
			}
		}
	});
}

function pathfind(err,delta) {
	if (err) {
		logger.error(err);
	}

	if (!delta.new_val) {
		return;
	}

  console.log('unit updated');
	process(delta.new_val.map);
}

async function process(mapName) {
	let results = await db.units[mapName].getUnprocessedPath();
	if (results.replaced == 0) {
		return false;
	}

	for (let delta of results.changes) {
		if (delta.new_val) {
			await processUnit(delta.new_val);
		}
	}

	return true;
}

async function processUnit(unit) {
	console.log('pathing for unit ' + unit.type);
	//console.log(unit);
	//TODO
	//calculate the path for the unit
	//save the path back to the unit
}
