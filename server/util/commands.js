/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var env = require('../config/env.js');
var vorpal = require('vorpal')();
var colors = require('colors');
var db = require('../db/db.js');
var logger = require('../util/logger.js');

exports.init = () => {
	if(process.argv.length > 2) {
		const commands = process.argv.slice(2, process.argv.length);
		console.log("handling command:", commands.join(' '));
		vorpal.exec(commands.join(' ')).then(process.exit);

	} else {
		vorpal.delimiter('badmars'.red + '$').show();
	}
}

//==================================================================
// dev methods

var Unit = require('../unit/unit.js');

vorpal.command('test', 'does SOMETHING')
	.action((args) => {
		//today it makes a unit
		var unit = new Unit('tank');
		db.units['testplanet'].addUnit(unit).then((delta) => {
			console.log(delta);
		});

	});

//==================================================================
// map methods

vorpal.command('listmaps', 'list all created maps')
	.action((args) => {
		return db.map.listNames().then((names) => {
			console.log(names);
		});
	});

vorpal.command('removemap <name>', 'remove a specific map')
	.autocomplete({
		data: () => {
			return db.map.listNames();
		}
	})
	.action((args, callback) => {
		return db.map.removeMap(args.name).then(() => {
			console.log('success');
		});
	});

vorpal.command('createmap <name>', 'create a new random map')
	.action((args, callback) => {
		return db.map.createRandomMap(args.name).then(() => {
			console.log('created map ' + args.name);
		});
	});


//==================================================================
// user methods
vorpal.command('createuser <name> [apikey]', 'create a user account with an api key')
	.action((args, callback) => {
		return db.user.createUser(args.name, '0xffffff').then((result) => {
			if(result.inserted !== 1) {
				throw new Error('failed to create user');
			}
			if(args.apikey) {
				return db.user.updateUser(args.name, { apiKey: args.apikey });
			}
		}).then((result) => {
			console.log(result);
		})
	});

vorpal.command('removeuser <name>', 'remove all accounts with a given name')
	.action((args, callback) => {
		return db.user.deleteUser(args.name)
	});
