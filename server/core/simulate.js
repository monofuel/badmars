//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

exports.init = () => {
	setInterval(mapTick, 1000 / (env.ticksPerSec));
};

async function mapTick() {
	let names = await db.map.listNames();
	for (var name of names) {
		//NOTICE
		//this is shoddy and generally a terrible idea.
		//but it works, and allows for multiple instances running this to not step over each other for now.
		//this was probably done in completely the wrong way.
		//the updating of this value 'kicks off' the entire system, and starts unit simulation.
		tryNewTick(name);
	}
}

async function tryNewTick(name) {
	let map = await db.map.getMap(name);

	//TODO if map.lastTickTimestamp is in the future, this whole thing is fubared. fix this.
	//TODO should do this check atomically when updating with rethinkdb branch
	if (map.lastTick !== 0 && (new Date()).getTime() - map.lastTickTimestamp < 1000 / env.ticksPerSec) {
		return;
	}

	let uCount = await db.units[name].countUnprocessedUnits(map.lastTick);
	let awakeCount = await db.units[name].countAwakeUnits();
	let allCount = await db.units[name].countAllUnits();

	console.log("(unprocessed/awake/all) | (" + uCount + "/" + awakeCount + "/" + allCount + ")");
	logger.addAverageStat('unprocessedUnitCount', uCount);
	logger.addAverageStat('totalUnitCount', allCount);
	logger.addAverageStat('totalAwakeCount', awakeCount);

	if (uCount === awakeCount) {
		console.info('skipping tick');
		return;
	}

	map.lastTickTimestamp = (new Date()).getTime();
	map.lastTick++;
	//TODO do this more elegantly
	//clobbers all updated values for map
	return map.save();
}
