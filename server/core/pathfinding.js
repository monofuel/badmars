/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Unit from '../unit/unit';
import SimplePath from '../nav/simplepath';
import AStarPath from '../nav/astarpath';
import DIRECTION from '../map/directions';
import context from 'node-context';

var registeredMaps = [];

async function init() {
	setInterval(registerListeners, 1000);

	await registerListeners();

	let maps = await db.map.listNames();

	for(let mapName of maps) {
		while(await process(mapName));
		//process(mapName);
	}

};
exports.init = init;

function registerListeners() {
	db.map.listNames().then((names) => {
		for(let name of names) {
			if(registeredMaps.indexOf(name) === -1) {
				registeredMaps.push(name);
				db.units[name].registerPathListener(pathfind);
				console.log('registering for ' + name);
			}
		}
	});
}

function pathfind(err, delta) {
	if(err) {
		logger.error(err);
	}

	if(!delta.new_val) {
		return;
	}

	//console.log('unit updated');
	process(delta.new_val.map);
}

async function process(mapName) {
	//TODO fix this stuff
	//doesn't work properly with multiple pathfinding services.
	let results = await db.units[mapName].getUnprocessedPath();
	//console.log(results);

	//TODO this logic should probably be in db/units.js
	if(results.replaced === 0) {
		return false;
	}

	for(let delta of results.changes) {
		if(delta.new_val) {
			await processUnit(delta.new_val);
		}
	}

	return true;
}

async function processUnit(unitDoc) {
	let unit = await new Unit();
	unit.clone(unitDoc);

	if(unit.movementType !== 'ground') {
		return;
	}

	console.log('pathing for unit ' + unit.type);
	//console.log(unit);
	let map = await db.map.getMap(unit.map);

	let start = await map.getLoc(unit.x, unit.y);
	if(!unit.destination) {
		return;
	}
	let destinationX = unit.destination.split(":")[0];
	let destinationY = unit.destination.split(":")[1];
	let dest = await map.getLoc(destinationX, destinationY);

	//if the destination is covered, get the nearest valid point.
	let end = await map.getNearestFreeTile(dest, unit, false);
	if(!dest.equals(end)) {
		console.log('tweaking destination');
	}

	if(start.equals(end)) {
		await unit.clearDestination();
		return;
	}

	let pathfinder = new AStarPath(start, end, unit);

	if(pathfinder.generate) {
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
		if(dir === DIRECTION.C || nextTile.equals(end)) {
			break;
		}
	} while (true);

	await unit.setPath(path);
	await unit.updateUnit({ destination: end.x + ":" + end.y });
}
