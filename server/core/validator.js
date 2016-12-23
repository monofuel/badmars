/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const _ = require('lodash');
const db = require('../db/db.js');
import env from '../config/env';
const logger = require('../util/logger.js');
import Unit from '../unit/unit.js';
import { Chunk } from '../map/chunk.js';

import Context from 'node-context';
var maps = [];

exports.init = async() => {
	if (process.argv.length > 2) {
		maps = process.argv.slice(2, process.argv.length);
	} else {
		maps = await db.map.listNames();
	}
	console.log("checking maps", maps)

	console.log('-------------------------------');
	console.log('starting validation');
	console.log('-------------------------------');

	for (var mapName of maps) {
		const map = await db.map.getMap(mapName);
		if (!map) {
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
	//TODO should rename listUnits to just list (and friends)
	const unitList = await db.units[mapName].listUnits();
	for (const unitDoc of unitList) {
		counter++;
		const unit = new Unit();
		unit.clone(unitDoc);
		await unit.validate();
	}
	console.log('units validated: ', counter);
}

async function validateChunks(mapName: string) {
	console.log('validating chunks');
	let counter = 0;
	const chunkList = await db.chunks[mapName].list();
	for (const chunkDoc of chunkList) {
		counter++;
		const chunk = new Chunk();
		chunk.clone(chunkDoc);
		await chunk.validate();
	};
	console.log('chunks validated: ', counter);
}


async function checkUnitLocations(mapName: string) {
	const unitList = await db.units[mapName].listUnits();
	const tileMap = {};
	for (let unit of unitList) {
		if (!unit.tileHash) {
			throw new Error('unit missing tile: ' + unit.uuid);
		}
		if (unit.type === 'iron' || unit.type === 'oil') {
			continue;
		}
		for (let tileHash of unit.tileHash) {
			if (tileMap[tileHash]) {
				throw new Error('conflicting tile location:' + tileHash);
			}
			tileMap[tileHash] = unit.uuid;
		}
	}
	const chunkTileMap = {};
	const chunks = await db.chunks[mapName].listChunks();
	for (let chunk of chunks) {
		_.each(chunk.units, (uuid, tileHash) => {
			if (chunkTileMap[tileHash]) {
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
