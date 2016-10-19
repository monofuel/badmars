//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require("babel-register");
require("babel-polyfill");

var env = require('./config/env.js');
var db = require('./db/db.js');
var logger = require('./util/logger.js');
var commands = require('./util/commands.js');
var validator = require('./core/validator.js');

var figlet = require('figlet');

logger.setModule('validator');

function init() {
	logger.info("start begin");
	db.init()
	.then(validator.init)
	.then(() => {
		logger.info("start complete");
	}).catch((err) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
	});
}

init();
