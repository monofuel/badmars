/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type MonoContext from '../../util/monoContext';
import User from '../../user/user';
import Client from '../client';

const DEFAULT_CHANNEL = 'global';

export default async function sendChat(ctx: MonoContext,client: Client, data: Object): Promise<void> {
	const user: User = client.user;
	if(!data.text) {
		client.sendError(ctx, 'sendChat', 'no text set');
		return;
	}

	if(data.channel) {
		//TODO
		//for factions and private message stuff, we should filter
	}


	await ctx.db.chat.sendChat(user, data.text, data.channel || DEFAULT_CHANNEL);

	//realtime system should send player their new chat message,
	//no need to send success
	//client.send('sendChat');
};
