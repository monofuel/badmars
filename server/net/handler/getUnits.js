/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

export default async function getUnits(ctx: Context, client: Client, data: Object) {
	console.log('sending player their own units');
	let units = await db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	client.send('units', { units: units });
};
