/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

async function handleSpawn(ctx: Context, client: Client, data: Object) {
	let units: Array < Unit > = await db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	if(units.length > 0) {
		console.log('already have units');
		client.sendError('spawn', 'already have units');
		return;
	}

	units = await client.map.spawnUser(ctx, client);

	client.send('spawn');
	client.send('units', { units: units });
};

module.exports = handleSpawn;
