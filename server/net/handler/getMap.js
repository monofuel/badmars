//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {
	db.chunks[client.planet.mapName].listChunks().then((chunks) => {
		client.send('planet',{chunks:chunks});
	});
};
