//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require('babel-register');

const db = require('./db/db').db;
const logger = require('./util/logger.js');
const commands = require('./util/commands.js');



logger.setModule('commander');
function init() {
	logger.info('start begin');

	const startupPromises = [];
	startupPromises.push(db.init());
	Promise.all(startupPromises)
		.then(() => {
			logger.info('start complete');
			commands.init();
		}).catch((err: Error) => {
			logger.error(err);
			logger.info('start script caught error, exiting');
			process.exit();
		});
}

init();
