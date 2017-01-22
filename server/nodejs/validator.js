//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require('babel-register');
require('babel-polyfill');

const env = require('./config/env.js');
const db = require('./db/db').db;
const logger = require('./util/logger.js');
const commands = require('./util/commands.js');
const validator = require('./core/validator.js');

logger.setModule('validator');

function init() {
	logger.info('start begin');
	db.init()
	.then(validator.init)
	.then(() => {
		logger.info('start complete');
	}).catch((err) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
	});
}

init();
