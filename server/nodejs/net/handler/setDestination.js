/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import Context from 'node-context';
import Client from '../client';

async function setDestination(ctx: Context, client: Client, data: Object): Promise<void> {
	if(!data.unitId) {
		return client.sendError('setDestination', 'no unit specified');
	}
	if(!data.location || data.location.length !== 2) {
		return client.sendError('setDestination', 'no or invalid location set');
	}

	let unit = await db.units[client.planet.name].getUnit(data.unitId);
	if(unit.owner !== client.user.uuid) {
		return client.sendError('setDestination', 'not your unit');
	}

	try {
		let success = await unit.setDestination(data.location[0], data.location[1]);

		if(success) {
			client.send('setDestination');
		} else {
			client.sendError('setDestination', 'invalid order');
		}
	} catch(err) {
		logger.error(err);
		client.sendError('setDestination', 'server error');
	}
};

module.exports = setDestination;