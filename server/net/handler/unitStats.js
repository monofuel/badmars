//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';
var fs = require('fs');
var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

var unitStats = JSON.parse(fs.readFileSync('config/units.json'));

fs.watchFile("config/units.json", () => {
	console.log('units.json updated, reloading');
	fs.readFile('config/units.json', (err,data) => {
		console.log('pushing unit updates to player');
		client.send('unitStats',{units: unitStats});
		unitStats = JSON.parse(data);
	});
});

module.exports = (client,data) => {
	client.send('unitStats',{units: unitStats});
};
