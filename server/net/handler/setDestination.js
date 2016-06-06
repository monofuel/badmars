//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {
	//TODO
};

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
