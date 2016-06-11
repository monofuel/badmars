//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

async function setDestination(client,data) {
	if (!data.unitId) {
		return client.sendError('setDestination', 'no unit specified');
	}
	if (!data.location || data.location.length !== 2) {
		return client.sendError('setDestination', 'no or invalid location set');
	}

	let unit = await db.units[client.planet.name].getUnit(data.unitId);
	if (unit.owner !== client.user.uuid) {
		return client.sendError('setDestination', 'not your unit');
	}

	let result = await unit.setDestination(data.location[0],data.location[1]);

};

module.exports = setDestination;

/* //old code
if (!message.unitId)
	return @ws.send(errMsg('setDestination', 'no unit specified'))
if (!message.location)
	return @ws.send(errMsg('setDestination', 'no location set'))
if (@planet.updateUnitDestination(@userInfo.id,message.unitId,message.location))
	@ws.send(success('setDestination'))
else
	@ws.send(errMsg('setDestination', 'invalid'))
*/
