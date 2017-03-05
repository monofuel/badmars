/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type MonoContext from '../../util/monoContext';
import Client from '../client';

export default async function getMap(ctx: MonoContext, client: Client): Promise<void> {
	client.send('map', { map: client.planet });

	const userList = await ctx.db.user.listAllSanitizedUsers();
	client.send('players', { players: userList });
}
