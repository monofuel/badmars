/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import logger from '../../util/logger';
import Unit from '../../unit/unit';
import Context from 'node-context';
import Client from '../client';

// https://www.youtube.com/watch?v=PK-tVTsSKpw

export default async function createGhost(ctx: Context, client: Client, data: Object): Promise<void> {
	if(!data.unitType) {
		return client.sendError('createGhost', 'no unit specified');
	}
	if(!data.location || data.location.length !== 2) {
		return client.sendError('createGhost', 'no or invalid location set');
	}

	const map = client.map;

	try {
		//TODO validate the unit type
		//maybe this logic should be moved into map
		const unit = new Unit(data.unitType, map, data.location[0], data.location[1]);
		unit.details.ghosting = true;
		unit.details.owner = client.user.uuid;
		const success = await map.spawnUnit(ctx, unit);

		if(success) {
			client.send('createGhost');

			//wake up nearby ghost builders
			const units: Array<Unit> = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
			for(const nearby: Unit of units) {
				if(nearby.type === 'builder') {
					nearby.update(ctx, { awake: true });
				}
			}

		} else {
			client.sendError('createGhost', 'invalid order');
		}
	} catch(err) {
		logger.error(err);
		client.sendError('createGhost', 'server error');
	}
}
