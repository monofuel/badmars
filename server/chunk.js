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
var chunk = require('./core/chunk.js');

var figlet = require('figlet');

logger.setModule('chunk');

function init() {
	logger.info("start begin");

	startupHeader();
	var startupPromises = [];
	startupPromises.push(db.init());
	startupPromises.push(chunk.init());
	Promise.all(startupPromises)
	.then(() => {
		logger.info("start complete");
	}).catch((err) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
		shutdown();
	});
}

function startupHeader() {
	var fonts = figlet.fontsSync();
	var font = fonts[Math.floor(Math.random() * fonts.length)];
	console.log("----------------------------------------------------------------------------");
	console.log(figlet.textSync("BadMars", { font: font }));
	console.log("----------------------------------------------------------------------------");

	if (env.envType == 'production') {
		console.log('running in production!');
	} else {
		console.log('running in development');
	}
}

process.on('exit', () => {
	console.log('GOT EXIT');
	//GRPC likes to hang and prevent a proper shutdown for some reason
	chunk.forceShutdown();
});

init();
