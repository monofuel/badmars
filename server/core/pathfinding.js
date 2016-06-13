//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');
var Unit = require('../unit/unit.js');
var SimplePath = require('../nav/simplepath.js');
var AStarPath = require('../nav/astarpath.js');

var TILETYPES = require('../map/tiletypes.js');
var DIRECTION = require('../map/directions.js');

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
	//TODO fix this stuff
	//doesn't work properly with multiple pathfinding services.
	let results = await db.units[mapName].getUnprocessedPath();
	//console.log(results);
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

async function processUnit(unitDoc) {
	let unit = await new Unit();
	unit.clone(unitDoc);

	console.log('pathing for unit ' + unit.type);
	//console.log(unit);
	let map = await db.map.getMap(unit.map);

	let start = await map.getLoc(unit.x,unit.y);
	if (!unit.destination) {
		return;
	}
	let destinationX = unit.destination.split(":")[0];
	let destinationY = unit.destination.split(":")[1];
	let end = await map.getLoc(destinationX,destinationY);

	if (start.equals(end)) {
		await unit.clearDestination();
		return;
	}

	let pathfinder = new AStarPath(start,end, unit);

	if (pathfinder.generate) {
		//console.log('generating path');
		await pathfinder.generate();
	}
	let path = [];
	let dir = await pathfinder.getNext(start);
	let nextTile = start;
	do {
		let dir = await pathfinder.getNext(nextTile);
		//console.log('dir:' + DIRECTION.getTypeName(dir));
		nextTile = await nextTile.getDirTile(dir);
		path.push(DIRECTION.getTypeName(dir));
		if (dir === DIRECTION.C || nextTile.equals(end)) {
			break;
		}
	} while (true);

	unit.setPath(path);
}
