/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import logger from '../util/logger';
import Unit from '../unit/unit';
import AStarPath from '../nav/astarpath';
import DIRECTION from '../map/directions';
import Context from 'node-context';

const registeredMaps = [];

export async function init(): Promise<void> {
	setInterval(registerListeners, 1000);

	await registerListeners();

	const maps: Array<string> = await db.map.listNames();

	for(const mapName: string of maps) {
		while(await process(mapName));
		//process(mapName);
	}
}

async function registerListeners(): Promise<void> {
	const names: Array<string> = await db.map.listNames();
	for(const name of names) {
		if(registeredMaps.indexOf(name) === -1) {
			registeredMaps.push(name);
			db.units[name].registerPathListener(pathfind);
		}
	}
}

function pathfind(err: Error, delta: Object) {
	if(err) {
		logger.error(err);
	}

	if(!delta.new_val) {
		return;
	}

	//console.log('unit updated');
	process(delta.new_val.map);
}

async function process(mapName: string): Promise<Success> {
	//TODO fix this stuff
	//doesn't work properly with multiple pathfinding services.
	const results = await db.units[mapName].getUnprocessedPath();
	//console.log(results);

	//TODO this logic should probably be in db/units.js
	if(results.replaced === 0) {
		return false;
	}

	for(const delta of results.changes) {
		if(delta.new_val) {
			await processUnit(delta.new_val);
		}
	}

	return true;
}

async function processUnit(unitDoc: Object): Promise<void> {
	const unit = await new Unit();
	unit.clone(unitDoc);
	const ctx = new Context();

	if(unit.movementType !== 'ground') {
		return;
	}
	const map = await db.map.getMap(ctx, unit.map);

	const start = await map.getLoc(ctx, unit.x, unit.y);
	if(!unit.destination) {
		return;
	}
	const destinationX = unit.destination.split(':')[0];
	const destinationY = unit.destination.split(':')[1];
	const dest = await map.getLoc(ctx, destinationX, destinationY);

	//if the destination is covered, get the nearest valid point.
	const end = await map.getNearestFreeTile(ctx, dest, unit, false);
	if (!end) {
		throw new Error('no nearby free tile?');
	}

	if(start.equals(end)) {
		await unit.clearDestination();
		return;
	}

	const pathfinder = new AStarPath(start, end, unit);

	if(pathfinder.generate) {
		//console.log('generating path');
		await pathfinder.generate();
	}
	const path = [];

	let nextTile = start;
	do {
		const dir = await pathfinder.getNext(nextTile);
		//console.log('dir:' + DIRECTION.getTypeName(dir));
		nextTile = await nextTile.getDirTile(ctx, dir);
		path.push(DIRECTION.getTypeName(dir));
		if(dir === DIRECTION.C || nextTile.equals(end)) {
			break;
		}
	} while (true);

	await unit.setPath(path);
	await unit.updateUnit({ destination: end.x + ':' + end.y });
}
