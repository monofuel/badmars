//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require('babel-register');
require('babel-polyfill');

const db = require('./db/db').db;
const logger = require('./util/logger.js');
const validator = require('./core/validator.js');

logger.setModule('validator');

function init() {
	logger.info('start begin');
	db.init()
	.then(validator.init)
	.then(() => {
		logger.info('start complete');
	}).catch((err: Error) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
	});
}

init();
