
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import logger, { WrappedError } from '../../logger';
import Context from '../../context';
import db from '../../db';
import Client from '../client';
import { addFactoryOrder } from '../../unit/unit';

// https://www.youtube.com/watch?v=80DtQD5BQ_A

export default async function factoryOrder(ctx: Context, client: Client, data: any): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, client.map.name);

	ctx.check('factoryOrder');
	if (!data.factory) {
		return client.sendError(ctx, 'factoryOrder', 'no factory specified');
	}

	if (!data.unitType) {
		return client.sendError(ctx, 'factoryOrder', 'no unitType specified');
	}

	const unit = await planetDB.unit.get(ctx, data.factory);
	if (!unit || unit.details.owner !== client.user.uuid) {
		return client.sendError(ctx, 'factoryOrder', 'not your unit');
	}

	try {
		await addFactoryOrder(ctx, unit, data.unitType);
		client.send('factoryOrder');
	} catch (err) {
		logger.trackError(ctx, new WrappedError(err, 'failed to add factory order'));
		client.sendError(ctx, 'factoryOrder', 'failed to add factory order');
	}

}
