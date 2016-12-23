/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

// https://www.youtube.com/watch?v=80DtQD5BQ_A

async function factoryOrder(client, data) {
	console.log(data);
	if(!data.factory) {
		return client.sendError('factoryOrder', 'no factory specified');
	}

	if(!data.unitType) {
		return client.sendError('factoryOrder', 'no unitTtype specified');
	}

	let unit = await db.units[client.planet.name].getUnit(data.factory);
	if(!unit || unit.owner !== client.user.uuid) {
		return client.sendError('factoryOrder', 'not your unit');
	}

	try {
		let success = await unit.addFactoryOrder(data.unitType);

		if(success) {
			client.send('factoryOrder');
		} else {
			client.sendError('factoryOrder', 'invalid order');
		}

	} catch(err) {
		logger.error(err);
		client.sendError('factoryOrder', 'server error');
	}

};

module.exports = factoryOrder;
