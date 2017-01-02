/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Unit from '../unit/unit';
import Chunk from '../map/chunk';

import Context from 'node-context';
var maps = [];

exports.init = async() => {
	const ctx = new Context();
	if(process.argv.length > 2) {
		maps = process.argv.slice(2, process.argv.length);
	} else {
		maps = await db.map.listNames();
	}
	console.log("checking maps", maps)

	console.log('-------------------------------');
	console.log('starting validation');
	console.log('-------------------------------');

	for(var mapName: string of maps) {
		const map = await db.map.getMap(ctx, mapName);
		if(!map) {
			console.log("no such map");
			process.exit(-1);
		}
		await validateUnits(mapName);
		await validateChunks(mapName);
		//TODO validate maps
	}

	process.exit();
}

async function validateUnits(mapName: string) {
	console.log('validating units');
	let counter = 0;
	//TODO should rename listUnits to just list (and friends)``
	const promises = [];
	await db.units[mapName].each((unit) => {
		counter++;
		promises.push(unit.validate());
	});
	Promise.all(promises);
	console.log('units validated: ', counter);
}

async function validateChunks(mapName: string) {
	console.log('validating chunks');
	let counter = 0;
	const promises = [];
	await db.chunks[mapName].each((chunk) => {
		counter++;
		promises.push(chunk.validate());
	});
	Promise.all(promises);
	console.log('chunks validated: ', counter);
}


async function checkUnitLocations(mapName: string) {
	const unitList = await db.units[mapName].listUnits();
	const tileMap = {};
	for(let unit of unitList) {
		if(!unit.tileHash) {
			throw new Error('unit missing tile: ' + unit.uuid);
		}
		if(unit.type === 'iron' || unit.type === 'oil') {
			continue;
		}
		for(let tileHash of unit.tileHash) {
			if(tileMap[tileHash]) {
				throw new Error('conflicting tile location:' + tileHash);
			}
			tileMap[tileHash] = unit.uuid;
		}
	}
	const chunkTileMap = {};
	const chunks = await db.chunks[mapName].listChunks();
	for(let chunk of chunks) {
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

}
