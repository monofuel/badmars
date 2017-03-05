/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type MonoContext from '../../util/monoContext';
import Client from '../client';

export default async function getUnits(ctx: MonoContext, client: Client): Promise<void> {
	const units: Array<Unit> = await ctx.db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	client.send('units', { units: units });
}
