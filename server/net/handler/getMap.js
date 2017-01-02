/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

async function getMap(ctx: Context, client, data) {
	client.send('map', { map: client.planet });

	let userList = await db.user.listAllSanitizedUsers();
	client.send('players', { players: userList });

	//TODO: be more intelligent on this. only send chunks where the owner has units at
	/*for (var i = -6; i < 6; i++) {
		for (var j = -6; j < 6; j++) {
			let chunk = await client.planet.getChunk(i,j);

			client.send('chunk',{chunk:chunk});

			let units = await chunk.getUnits();
			if (units.length > 0) {
				//TODO sanitize unit data
				client.send('units',{units:units});
			}
		}
	}*/
};

module.exports = getMap;
