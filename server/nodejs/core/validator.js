/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import logger from '../util/logger';
import type Unit from '../unit/unit';
import type Chunk from '../map/chunk';

import Context from 'node-context';
let maps = [];

export async function init(): Promise<void> {
	const ctx = new Context();
	if(process.argv.length > 2) {
		maps = process.argv.slice(2, process.argv.length);
	} else {
		maps = await db.map.listNames();
	}

	for(const mapName: string of maps) {
		const map = await db.map.getMap(ctx, mapName);
		if(!map) {
			logger.info('no such map', { mapName });
			process.exit(-1);
		}
		await validateUnits(mapName);
		await validateChunks(mapName);
		//TODO validate maps
	}

	process.exit();
}

async function validateUnits(mapName: string): Promise<void> {
	let counter = 0;
	//TODO should rename listUnits to just list (and friends)``
	const promises = [];
	await db.units[mapName].each((unit: Unit) => {
		counter++;
		promises.push(unit.validate());
	});
	Promise.all(promises);
	logger.info('units validated: ', { counter });
}

async function validateChunks(mapName: string): Promise<void> {
	let counter = 0;
	const promises = [];
	await db.chunks[mapName].each((chunk: Chunk) => {
		counter++;
		promises.push(chunk.validate());
	});
	Promise.all(promises);
	logger.info('chunks validated: ', { counter });
}


/*async function checkUnitLocations(mapName: string) {
	const unitList = await db.units[mapName].listUnits();
	const tileMap = {};
	for(const unit of unitList) {
		if(!unit.tileHash) {
			throw new Error('unit missing tile: ' + unit.uuid);
		}
		if(unit.type === 'iron' || unit.type === 'oil') {
			continue;
		}
		for(const tileHash of unit.tileHash) {
			if(tileMap[tileHash]) {
				throw new Error('conflicting tile location:' + tileHash);
			}
			tileMap[tileHash] = unit.uuid;
		}
	}
	const chunkTileMap = {};
	const chunks = await db.chunks[mapName].listChunks();
	for(const chunk of chunks) {
		_.each(chunk.units, (uuid, tileHash) => {
			if(chunkTileMap[tileHash]) {
				console.log('chunk', chunk.hash);
				throw new Error('conflicting chunk tile location:' + tileHash);
			}
			chunkTileMap[tileHash] = uuid;
		});
	}
	/*
	const chunkTileUuids = _.map(chunkTileMap);
	const unitTileUuids = _.map(tileMap);
	if (chunkTileUuids.length != unitTileUuids.length) {
	  console.log(_.union(_.difference(unitTileUuids,chunkTileUuids)));
	  throw new Error('chunk unit lists are missing units');
	}*/

//}
