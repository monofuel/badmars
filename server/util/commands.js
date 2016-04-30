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
	.action((args,callback) => {
		console.log("TODO");
		callback();
	});

vorpal.command('removemap [name]', 'remove a specific map')
	.autocomplete({
		data: () => {
			console.log("TODO");
		}
	})
	.action((args,callback) => {
		console.log("TODO");
		callback();
	});

vorpal.command('createmap [name]', 'create a new map')
	.autocomplete({
		data: () => {
			console.log("TODO");
		}
	})
	.action((args,callback) => {
		console.log("TODO");
		callback();
	});

//==================================================================
// world methods

vorpal.command('listworlds', 'list all created worlds')
	.action((args,callback) => {
		console.log("TODO");
		callback();
	});

vorpal.command('removeworld [name]', 'remove a specific world')
	.autocomplete({
		data: () => {
			console.log("TODO");
		}
	})
	.action((args,callback) => {
		console.log("TODO");
		callback();
	});

vorpal.command('createworld [name] [map]', 'create a new world')
	.autocomplete({
		data: () => {
			console.log("TODO");
		}
	})
	.action((args,callback) => {
		console.log("TODO");
		callback();
	});
