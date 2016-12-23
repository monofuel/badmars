/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../../db/db.js');
import env from '../../config/env';
var logger = require('../../util/logger.js');

const DEFAULT_CHANNEL = 'global';

module.exports = async(client, data) => {
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
