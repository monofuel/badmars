//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

/*
'use strict';
require('babel-register');
require('babel-polyfill');

const db = require('./db/db');
const logger = require('./logger.js');
const simulate = require('./core/simulate.js');

function init() {
	logger.setModule('simulate');
	logger.info('start begin');

	const startupPromises = [];
	startupPromises.push(db.init());
	Promise.all(startupPromises)
	.then(() => {
		logger.info('start complete');
		simulate.init();
	}).catch((err) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
		process.exit();
	});
}

init();
*/