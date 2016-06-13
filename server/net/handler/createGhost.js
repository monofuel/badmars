//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

var Unit = require('../../unit/unit.js');

// https://www.youtube.com/watch?v=PK-tVTsSKpw

async function createGhost(client,data) {
	if (!data.unitType) {
		return client.sendError('createGhost', 'no unit specified');
	}
	if (!data.location || data.location.length !== 2) {
		return client.sendError('createGhost', 'no or invalid location set');
	}

	let map = client.map;

	try {
		//TODO validate the unit type
		//maybe this logic should be moved into map
		let unit = new Unit(data.unitType,map,data.location[0],data.location[1]);
		unit.ghosting = true;
		unit.owner = client.user.uuid;
		let success = map.spawnUnit(unit);

		if (success) {
			console.log('new ghost unit');
			client.send('createGhost');
		} else {
			client.sendError('createGhost', 'invalid order');
		}
	} catch (err) {
		logger.error(err);
		client.sendError('createGhost', 'server error');
	}
};

module.exports = createGhost;
