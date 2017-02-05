/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import logger from '../../util/logger';
import Context from 'node-context';
import Client from '../client';

// https://www.youtube.com/watch?v=80DtQD5BQ_A

export default async function factoryOrder(ctx: Context, client: Client, data: Object): Promise<void> {
	logger.checkContext(ctx, 'factoryOrder');
	if(!data.factory) {
		return client.sendError('factoryOrder', 'no factory specified');
	}

	if(!data.unitType) {
		return client.sendError('factoryOrder', 'no unitTtype specified');
	}

	const unit = await db.units[client.planet.name].getUnit(ctx, data.factory);
	if(!unit || unit.owner !== client.user.uuid) {
		return client.sendError('factoryOrder', 'not your unit');
	}

	try {
		const success = await unit.addFactoryOrder(ctx, data.unitType);

		if(success) {
			client.send('factoryOrder');
		} else {
			client.sendError('factoryOrder', 'invalid order');
		}

	} catch(err) {
		logger.error(err);
		client.sendError('factoryOrder', 'server error');
	}

}
