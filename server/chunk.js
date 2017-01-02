//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require("babel-register");
require("babel-polyfill");

var env = require('./config/env.js');
const db = require('./db/db').db;
var logger = require('./util/logger.js');
var commands = require('./util/commands.js');
var chunk = require('./core/chunk.js');

var figlet = require('figlet');

logger.setModule('chunk');

function init() {
	logger.info("start begin");
	db.init()
	.then(chunk.init)
	.then(() => {
		logger.info("start complete");
	}).catch((err) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
	});
}

init();
