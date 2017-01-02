/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

const DEFAULT_CHANNEL = 'global';

module.exports = async(ctx: Context, client, data) => {
	let user = client.user;
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
}
