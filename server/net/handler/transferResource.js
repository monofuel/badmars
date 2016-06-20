//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

async function transferResource(client,data) {

	if (!data.source) {
		return client.sendError('transferResource','missing source');
	}
	if (!data.dest) {
		return client.sendError('transferResource','missing dest');
	}
	if (!data.iron && !data.fuel) {
		return client.sendError('transferResource','missing resource (iron and or fuel)');
	}

	let sourceUnit = await db.units[client.planet.name].getUnit(data.source);
	let destUnit = await db.units[client.planet.name].getUnit(data.dest);

	if (!sourceUnit || sourceUnit.owner !== client.user.uuid) {
			return client.sendError('transferResource','source unit is not yours');
	}
	if (!destUnit || destUnit.owner !== client.user.uuid) {
			return client.sendError('transferResource','dest unit is not yours');
	}



}

module.exports = transferResource;