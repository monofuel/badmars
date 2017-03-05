/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type MonoContext from '../../util/monoContext';
import Client from '../client';
import type User from '../../user/user';

export default async function getPlayers(ctx: MonoContext, client: Client): Promise<void> {
	await ctx.db.user.listAllSanitizedUsers().then((users: Array<User>) => {
		client.send('players', { players: users });
	});
}
