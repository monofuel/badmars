//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {
	db.map.getMap(client.planet.mapName).then((map) => {
		client.send('map',{map:map});

		//TODO: be more intelligent on this. only send chunks where the owner has units at
		for (var i = -6; i < 6; i++) {
			for (var j = -6; j < 6; j++) {
				client.planet.getChunk(i,j).then((chunk) => {
					client.send('chunk',{chunk:chunk});
				});
			}
		}
	});
};
