//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require("babel-register");

var env = require('./config/env.js');
var db = require('./db/db.js');
var logger = require('./util/logger.js');
var commands = require('./util/commands.js');
var figlet = require('figlet');



logger.setModule('commander');
function init() {
	logger.info('start begin');

	var startupPromises = [];
	startupPromises.push(db.init());
	Promise.all(startupPromises)
		.then(() => {
			logger.info('start complete');
			commands.init();
		}).catch((err) => {
			console.log(err.stack);
			console.log('exiting badmars');
			process.exit();
		});
}

init();
