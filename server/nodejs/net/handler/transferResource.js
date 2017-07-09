/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import Client from '../client';

export default async function transferResource(ctx: MonoContext, client: Client, data: Object): Promise<void> {
	if(!data.source) {
		return client.sendError(ctx, 'transferResource', 'missing source');
	}
	if(!data.dest) {
		return client.sendError(ctx, 'transferResource', 'missing dest');
	}
	if(!data.iron && !data.fuel) {
		return client.sendError(ctx, 'transferResource', 'missing resource (iron and or fuel)');
	}

	const sourceUnit = await ctx.db.units[client.planet.name].getUnit(ctx, data.source);
	const destUnit = await ctx.db.units[client.planet.name].getUnit(ctx, data.dest);

	if(!sourceUnit || sourceUnit.details.owner !== client.user.uuid) {
		return client.sendError(ctx, 'transferResource', 'source unit is not yours');
	}
	if(!destUnit || destUnit.details.owner !== client.user.uuid) {
		return client.sendError(ctx, 'transferResource', 'dest unit is not yours');
	}

	sourceUnit.setTransferGoal(destUnit.uuid, data.iron || 0, data.fuel || 0);

	client.send('transferResource');


}
