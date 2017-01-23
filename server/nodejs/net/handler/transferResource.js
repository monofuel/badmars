/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import Context from 'node-context';
import Client from '../client';

async function transferResource(ctx: Context, client: Client, data: Object): Promise<void> {
	if(!data.source) {
		return client.sendError('transferResource', 'missing source');
	}
	if(!data.dest) {
		return client.sendError('transferResource', 'missing dest');
	}
	if(!data.iron && !data.fuel) {
		return client.sendError('transferResource', 'missing resource (iron and or fuel)');
	}

	const sourceUnit = await db.units[client.planet.name].getUnit(ctx, data.source);
	const destUnit = await db.units[client.planet.name].getUnit(ctx, data.dest);

	if(!sourceUnit || sourceUnit.owner !== client.user.uuid) {
		return client.sendError('transferResource', 'source unit is not yours');
	}
	if(!destUnit || destUnit.owner !== client.user.uuid) {
		return client.sendError('transferResource', 'dest unit is not yours');
	}

	sourceUnit.setTransferGoal(destUnit.uuid, data.iron || 0, data.fuel || 0);

	client.send('transferResource');


}

module.exports = transferResource;
