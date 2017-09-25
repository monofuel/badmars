
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../../util/context';
import Client from '../client';
import User from '../../user/user';

export default async function getPlayers(ctx: Context, client: Client): Promise<void> {
	await ctx.db.user.listAllSanitizedUsers().then((users: Array<User>) => {
		client.send('players', { players: users });
	});
}
