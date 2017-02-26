/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import User from '../../user/user';
import Context from 'node-context';
import Client from '../client';

const DEFAULT_CHANNEL = 'global';

export default async function sendChat(ctx: Context,client: Client, data: Object): Promise<void> {
	const user: User = client.user;
	if(!data.text) {
		client.sendError('sendChat', 'no text set');
		return;
	}

	if(data.channel) {
		//TODO
		//for factions and private message stuff, we should filter
	}


	await db.chat.sendChat(user, data.text, data.channel || DEFAULT_CHANNEL);

	//realtime system should send player their new chat message,
	//no need to send success
	//client.send('sendChat');
};
