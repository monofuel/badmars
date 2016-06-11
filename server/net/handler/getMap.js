//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

async function getMap(client,data) {
		client.send('map',{map:client.planet});

		//TODO: be more intelligent on this. only send chunks where the owner has units at
		for (var i = -6; i < 6; i++) {
			for (var j = -6; j < 6; j++) {
				let chunk = await client.planet.getChunk(i,j);

				client.send('chunk',{chunk:chunk});
				
				let units = await chunk.getUnits();
				if (units.length > 0) {
					//TODO sanitize unit data
					client.send('units',{units:units});
				}
			}
		}
};

module.exports = getMap;
