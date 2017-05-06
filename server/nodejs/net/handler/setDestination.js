/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { checkContext, WrappedError } from '../../util/logger';
import type MonoContext from '../../util/monoContext';
import Client from '../client';

export default async function setDestination(ctx: MonoContext, client: Client, data: Object): Promise<void> {
	checkContext(ctx, 'setDestination');
	if(!data.unitId) {
		return client.sendError(ctx, 'setDestination', 'no unit specified');
	}
	if(!data.location || data.location.length !== 2) {
		return client.sendError(ctx, 'setDestination', 'no or invalid location set');
	}
	const x = parseInt(data.location[0]);
	const y = parseInt(data.location[1]);

	const unit: Unit = await ctx.db.units[client.planet.name].getUnit(ctx, data.unitId);
	if(unit.details.owner !== client.user.uuid) {
		return client.sendError(ctx, 'setDestination', 'not your unit');
	}

	try {
		await unit.setDestination(ctx, x, y);
		client.send('setDestination');
	} catch(err) {
		ctx.logger.trackError(ctx, new WrappedError(err, 'failed to set destination'));
		client.sendError(ctx, 'setDestination', 'failed to set destination');
	}
}