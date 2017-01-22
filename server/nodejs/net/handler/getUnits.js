/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import Context from 'node-context';
import Client from '../client';

async function getUnits(ctx: Context, client: Client, data: Object): Promise<void> {
	console.log('sending player their own units');
	const units = await db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	client.send('units', { units: units });
}

module.exports = getUnits;
