/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import Context from 'node-context';
import Client from '../client';

async function getUnits(ctx: Context, client: Client): Promise<void> {
	const units = await db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	client.send('units', { units: units });
}

module.exports = getUnits;
