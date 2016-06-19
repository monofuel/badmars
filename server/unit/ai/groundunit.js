//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');


var TILETYPES = require('../../map/tiletypes.js');
var DIRECTION = require('../../map/directions.js');

//TODO
//not tested yet
async function simulate(unit,map) {

	if (await unit.tickMovement()) {
		console.log('movement cooldown: ' + unit.movementCooldown);
		return true;
	}

	if (!unit.path || unit.path.length === 0) {
		return false;
	}

	let start = await map.getLoc(unit.x,unit.y);
	let destinationX = unit.destination.split(":")[0];
	let destinationY = unit.destination.split(":")[1];
	let end = await map.getLoc(destinationX,destinationY);

	let dir = DIRECTION.getTypeFromName(unit.path.shift());
	let nextTile = await start.getDirTile(dir);
	//console.log(start.toString());
	//console.log(nextTile.toString());
	if (await unit.moveToTile(nextTile)) {
		console.log('updating path');
		await unit.setPath(unit.path);
	} else {
		unit.addPathAttempt();
		console.log('move halted');
	}

	return true;
}

exports.simulate = simulate;
