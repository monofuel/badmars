/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import Context from 'node-context';
import Client from '../client';
import Unit from '../../unit/unit';

async function handleSpawn(ctx: Context, client: Client): Promise<void> {
	let units: Array<Unit> = await db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	if(units.length > 0) {
		client.sendError('spawn', 'already have units');
		return;
	}


	await client.planet.spawnUser(ctx, client);
	units = await db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);

	client.send('spawn');
	client.send('units', { units: units });
}

module.exports = handleSpawn;
