//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

async function factoryOrder(client,data) {
	if (!data.unitId) {
		return client.sendError('factoryOrder', 'no unitId specified');
	}

	if (!data.unitType) {
		return client.sendError('factoryOrder', 'no unitTtype specified');
	}

	let unit = await db.units[client.planet.name].getUnit(data.unitId);
	if (unit.owner !== client.user.uuid) {
		return client.sendError('factoryOrder', 'not your unit');
	}

	try {
		let success = await unit.addFactoryOrder(data.unitType);

		if (success) {
			client.send('factoryOrder');
		} else {
				client.sendError('factoryOrder', 'invalid order');
		}

	} catch (err) {
		logger.error(err);
		client.sendError('factoryOrder', 'server error');
	}

};

module.exports = factoryOrder;
