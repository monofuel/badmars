/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import Context from 'node-context';
import Client from '../client';
import type User from '../../user/user';

async function getPlayers(ctx: Context, client: Client): Promise<void> {
	db.user.listAllSanitizedUsers().then((users: Array<User>) => {
		client.send('players', { players: users });
	});
}

module.exports = getPlayers;
