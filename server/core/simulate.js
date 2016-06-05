//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

exports.init = () => {
	setInterval(mapTick, 1000 / (env.ticksPerSec * 4));
};

function mapTick() {
	db.map.listNames().then((names) => {
		for (var name of names) {
			//NOTICE
			//this is shoddy and generally a terrible idea.
			//but it works, and allows for multiple instances running this to not step over each other for now.
			//this was probably done in completely the wrong way.
			//the updating of this value 'kicks off' the entire system, and starts unit simulation.
			tryNewTick(name);
		}
	});
}

function tryNewTick(name) {
	db.map.getMap(name).then((map) => {
		if (map.lastTick === 0 || (new Date()).getTime() - map.lastTickTimestamp > 1000 / env.ticksPerSec) {
			return db.units[name].countUnprocessedUnits(map.lastTick).then((uCount) => {
				db.units[name].countAllUnits().then((allCount) => {

					console.log("units processed: " + uCount + " /" + allCount);
					logger.addAverageStat('unprocessedUnitCount', uCount);
					logger.addAverageStat('totalUnitCount', allCount);

					map.lastTickTimestamp = (new Date()).getTime();
					map.lastTick++;
					//TODO do this more elegantly
					//clobbers all updated values for map
					return map.save().then();
				});
			});
		}
	});
}
