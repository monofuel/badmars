
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { checkContext, WrappedError } from '../../util/logger';
import Context from '../../util/context';
import Client from '../client';
import Unit from '../../unit/unit';

export default async function setDestination(ctx: Context, client: Client, data: any): Promise<void> {
	const { db, logger } = ctx;
	const planetDB = await db.getPlanetDB(ctx, this.location.map);

	checkContext(ctx, 'setDestination');
	if(!data.unitId) {
		return client.sendError(ctx, 'setDestination', 'no unit specified');
	}
	if(!data.location || data.location.length !== 2) {
		return client.sendError(ctx, 'setDestination', 'no or invalid location set');
	}
	const x = parseInt(data.location[0]);
	const y = parseInt(data.location[1]);

	const unit: Unit = await planetDB.unit.get(ctx, data.unitId);
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