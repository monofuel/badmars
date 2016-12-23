/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../../db/db.js');
import env from '../../config/env';
var logger = require('../../util/logger.js');

module.exports = (client, data) => {
	db.user.listAllSanitizedUsers().then((users) => {
		client.send('players', { players: users });
	});
};
