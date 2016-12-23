/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

async function getUnits(client, data) {
	console.log('sending player their own units');
	let units = await db.units[client.planet.name].listPlayersUnits(client.user.uuid);
	client.send('units', { units: units });
};


module.exports = getUnits;
