//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {
	var x = data.x || 0;
	var y = data.y || 0;
	client.planet.getChunk(x,y).then((chunk) => {
		client.send('chunk',{chunk:chunk});
	});
};
