/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { checkContext, WrappedError } from '../../util/logger';
import MonoContext from '../../util/monoContext';
import Client from '../client';

// https://www.youtube.com/watch?v=80DtQD5BQ_A

export default async function factoryOrder(ctx: MonoContext, client: Client, data: Object): Promise<void> {
	checkContext(ctx, 'factoryOrder');
	if(!data.factory) {
		return client.sendError(ctx, 'factoryOrder', 'no factory specified');
	}

	if(!data.unitType) {
		return client.sendError(ctx, 'factoryOrder', 'no unitType specified');
	}

	const unit = await ctx.db.units[client.planet.name].getUnit(ctx, data.factory);
	if(!unit || unit.owner !== client.user.uuid) {
		return client.sendError(ctx, 'factoryOrder', 'not your unit');
	}

	try {
		await unit.addFactoryOrder(ctx, data.unitType);
		client.send('factoryOrder');
	} catch(err) {
		ctx.logger.trackError(new WrappedError(err, 'failed to add factory order'));
		client.sendError(ctx, 'factoryOrder', 'failed to add factory order');
	}

}
