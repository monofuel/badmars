/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

module.exports = (client, data) => {
	db.user.listAllSanitizedUsers().then((users) => {
		client.send('players', { players: users });
	});
};
