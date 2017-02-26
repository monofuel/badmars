/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import Context from 'node-context';
import Client from '../client';

export default async function getMap(ctx: Context, client: Client): Promise<void> {
	client.send('map', { map: client.planet });

	const userList = await db.user.listAllSanitizedUsers();
	client.send('players', { players: userList });
}
