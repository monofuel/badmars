//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
require("babel-register");
require("babel-polyfill");
//this app.js script is ment for running the whole server at once
//usually either for development or if we are just running on 1 process.

var env = require('./config/env.js');
var db = require('./db/db.js');
var logger = require('./util/logger.js');
var commands = require('./util/commands.js');
var web = require('./core/web.js');

var figlet = require('figlet');

logger.setModule('web');

function init() {
	logger.info("start begin");

	startupHeader();
	var startupPromises = [];
	startupPromises.push(db.init());
	startupPromises.push(web.init());
	Promise.all(startupPromises)
	.then(() => {
		logger.info("start complete");
	}).catch((err) => {
		console.log(err);
		process.exit();
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

init();
