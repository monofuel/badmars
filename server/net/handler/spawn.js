/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../../db/db.js');
import env from '../../config/env';
var logger = require('../../util/logger.js');

async function handleSpawn(client, data) {
	let units = await db.units[client.planet.name].listPlayersUnits(client.user.uuid);
	if(units.length > 0) {
		console.log('already have units');
		client.sendError('spawn', 'already have units');
		return;
	}

	client.map.spawnUser(client).then((units) => {
		client.send('spawn');
	});
};

module.exports = handleSpawn;
