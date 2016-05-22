//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {
  client.map.spawnUser(client).then((units) => {
    client.send('spawn');
    client.send('units',{units:units});
  });
};
