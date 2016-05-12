//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {

	if (!data.planet) {
		client.sendError('login','specify a planet');
	}
	if (!data.username) {
		client.sendError('login','invalid username');
	}
	console.log(data.planet);
	db.planet.getPlanet(data.planet).then((planet) => {
		if (!planet) {
			throw new Error("planet doesn't exist");
		}
		console.log('user planet: ' + planet.name);
		client.planet = planet;

		return db.user.getUser(data.username);
	}).then((user) => {
		if (user) {
			console.log('user exists');
			if (data.apiKey != user.apiKey) {
				throw new Error('invalid api key');
			}
			console.log('login success for ' + user.name);
			client.username = user.name;

			//TODO mount all the user handlers
			client.handlers['getPlayers'] = require('./getPlayers.js');
			client.handlers['getUnits'] = require('./getUnits.js');
			client.handlers['getMap'] = require('./getMap.js');
			client.handlers['getChunk'] = require('./getChunk.js');

			client.send('login');

		} else {

			//TODO
			//verify user against oath2
			console.log('user doesnt exist');
			if (!data.color) {
				throw new Error("no hex color specified");
			}
			return db.user.createUser(data.username,data.color).then((result) => {
				if (result.inserted == 1) {
					var user = result.changes[0].new_val;
					console.log('account created for ' + user.name);
					client.username = user.name;
					client.send('login',{apiKey: user.apiKey});
				} else {
					console.log('creating user failed');
					console.log(result);
					throw new Error('registration error');
				}
			});
		}
	}).catch((error) => {
		console.log("error: " + error);
		client.sendError('login',error);
	});


};
