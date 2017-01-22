/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import Context from 'node-context';
import Client from '../client';

async function getPlayers(ctx: Context, client: Client, data: Object): Promise<void> {
	db.user.listAllSanitizedUsers().then((users) => {
		client.send('players', { players: users });
	});
}

module.exports = getPlayers;
