//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require('babel-register');
require('babel-polyfill');

const db = require('./db/db');
const logger = require('./util/logger.js');
const web = require('./core/web.js');

logger.setModule('web');

function init() {
	logger.info('start begin');

	const startupPromises = [];
	startupPromises.push(db.init());
	startupPromises.push(web.init());
	Promise.all(startupPromises)
	.then(() => {
		logger.info('start complete');
	}).catch((err) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
		process.exit();
	});
}

init();
