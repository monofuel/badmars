/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../../db/db.js');
import env from '../../config/env';
var logger = require('../../util/logger.js');

var Unit = require('../../unit/unit.js');

// https://www.youtube.com/watch?v=PK-tVTsSKpw

async function createGhost(client, data) {
	if(!data.unitType) {
		return client.sendError('createGhost', 'no unit specified');
	}
	if(!data.location || data.location.length !== 2) {
		return client.sendError('createGhost', 'no or invalid location set');
	}

	let map = client.map;

	try {
		//TODO validate the unit type
		//maybe this logic should be moved into map
		let unit = new Unit(data.unitType, map, data.location[0], data.location[1]);
		unit.ghosting = true;
		unit.owner = client.user.uuid;
		let success = await map.spawnUnit(unit);

		if(success) {
			console.log('new ghost unit');
			client.send('createGhost');

			//wake up nearby ghost builders
			let units = await map.getNearbyUnitsFromChunk(unit.chunkHash[0]);
			for(let nearby of units) {
				if(nearby.type === 'builder') {
					nearby.updateUnit({ awake: true });
				}
			}

		} else {
			client.sendError('createGhost', 'invalid order');
		}
	} catch(err) {
		logger.error(err);
		client.sendError('createGhost', 'server error');
	}
};

module.exports = createGhost;
