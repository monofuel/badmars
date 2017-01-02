//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require("babel-register");
require("babel-polyfill");
//this app.js script is ment for running the whole server at once
//usually either for development or if we are just running on 1 process.

var env = require('./config/env.js');
const db = require('./db/db').db;
var logger = require('./util/logger.js');
var net = require('./core/net.js');
var figlet = require('figlet');

logger.setModule('net');

function init() {
    logger.info("start begin");

    var startupPromises = [];
    startupPromises.push(db.init());
    Promise.all(startupPromises)
        .then(() => {
            logger.info("start complete");
            net.init();
        }).catch((err) => {
          logger.error(err);
          logger.info('start script caught error, exiting');
          process.exit();
        });
}

init();
