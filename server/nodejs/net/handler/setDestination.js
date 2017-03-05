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

	const unit: Unit = await ctx.db.units[client.planet.name].getUnit(ctx, data.unitId);
	if(unit.details.owner !== client.user.uuid) {
		return client.sendError(ctx, 'setDestination', 'not your unit');
	}

	try {
		const success = await unit.setDestination(ctx, data.location[0], data.location[1]);

		if(success) {
			client.send('setDestination');
		} else {
			client.sendError(ctx, 'setDestination', 'invalid order');
		}
	} catch(err) {
		ctx.logger.trackError(new WrappedError(err, 'failed to add factory order'));
		client.sendError(ctx, 'setDestination', 'failed to set destination');
	}
}