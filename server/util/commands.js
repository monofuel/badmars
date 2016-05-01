//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');
var vorpal = require('vorpal')();
var colors = require('colors');
var db = require('../db/db.js');
var logger = require('../util/logger.js');

exports.init = () => {
	vorpal.delimiter('badmars'.red + '$').show();
}

//==================================================================
// map methods

vorpal.command('listmaps', 'list all created maps')
	.action((args) => {
		return db.map.listNames().then((names) => {
			console.log(names);
		});
	});

vorpal.command('removemap [name]', 'remove a specific map')
	.autocomplete({
		data: () => {
			return db.map.listNames();
		}
	})
	.action((args, callback) => {
		if (!args.name) {
			console.log("you must specify a name");
			return callback();
		}
		return db.map.removeMapByName(args.name).then(() => {
			console.log('success');
		});
	});

vorpal.command('createmap [name]', 'create a new random map')
	.action((args, callback) => {
		if (!args.name) {
			console.log("you must specify a name");
			return callback();
		}
		return db.map.createRandomMap(args.name).then(() => {
			console.log('created map ' + args.name);
		});
	});

//==================================================================
// planet methods

vorpal.command('listplanets', 'list all created planets')
	.action((args) => {
		return db.planet.listNames().then((names) => {
			console.log(names);
		});
	});

vorpal.command('removeplanet [name]', 'remove a specific planet')
	.autocomplete({
		data: () => {
			return db.planet.listNames();
		}
	})
	.action((args, callback) => {
		if (!args.name) {
			console.log("you must specify a name");
			return callback();
		}
		return db.planet.removePlanetByName(args.name).then(() => {
			console.log('success');
		});
	});

vorpal.command('createplanet [name] [map]', 'create a new planet')
	.action((args, callback) => {
		console.log("TODO");
		callback();
	});
