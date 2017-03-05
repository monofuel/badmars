/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import Client from '../client';
import Unit from '../../unit/unit';

export default async function handleSpawn(ctx: MonoContext, client: Client): Promise<void> {
	let units: Array<Unit> = await ctx.db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	if(units.length > 0) {
		client.sendError(ctx, 'spawn', 'already have units');
		return;
	}

	await client.planet.spawnUser(ctx, client);
	units = await ctx.db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);

	client.send('spawn');
	client.send('units', { units: units });
}
