
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import { newUnit } from '../../unit/unit';
import Context from '../../context';
import Client from '../client';
import logger, { WrappedError } from '../../logger';

import Map from '../../map/map';
// https://www.youtube.com/watch?v=PK-tVTsSKpw

export default async function createGhost(ctx: Context, client: Client, data: any): Promise<void> {
	if (!data.unitType) {
		return client.sendError(ctx, 'createGhost', 'no unit specified');
	}
	if (!data.location || data.location.length !== 2) {
		return client.sendError(ctx, 'createGhost', 'no or invalid location set');
	}

	const map: Map = client.map;

	try {
		// TODO should have more validation around this stuff
		const loc = await map.getLoc(ctx, data.location[0], data.location[1]);
		const unit = await newUnit(ctx, data.unitType, loc);

		unit.details.ghosting = true;
		unit.details.owner = client.user.uuid;

		await map.spawnUnit(ctx, unit);

		client.send('createGhost');

		//wake up nearby ghost builders
		/*
		// TODO
		const units: Array<Unit> = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
		for (const nearby of units) {
			if (nearby.details.type === 'builder') {
				nearby.update(ctx, { awake: true });
			}
		}
		*/

	} catch (err) {
		logger.trackError(ctx, new WrappedError(err, 'error creating ghost'));
		client.sendError(ctx, 'createGhost', 'server error');
	}
}
