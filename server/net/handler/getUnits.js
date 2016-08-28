//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

async function getUnits(client,data) {
	console.log('sending player their own units');
	let units = await db.units[client.planet.name].listPlayersUnits(client.user.uuid);
	client.send('units',{units:units});
};


module.exports = getUnits;
