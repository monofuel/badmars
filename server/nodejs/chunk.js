//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require('babel-register');
require('babel-polyfill');

const db = require('./db/db');
const logger = require('./util/logger.js');
const chunk = require('./core/chunk.js');

logger.setModule('chunk');

function init() {
	logger.info('start begin');
	db.init()
	.then(chunk.init)
	.then(() => {
		logger.info('start complete');
	}).catch((err: Error) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
	});
}

init();
