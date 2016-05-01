//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');
var logger = require('../util/logger.js');
var r = require('rethinkdb');

exports.planet = require('./planet.js');
exports.map = require('./map.js');

var conn;

exports.init = () => {

	var options = {
		host: env.dbHost,
		db: env.database
	};
	if (env.dbPort) {
		options.port = env.dbPort;
	}
	if (env.dbUser) {
		options.user = env.dbUser;
	}
	if (env.dbPassword) {
		options.password = env.dbPassword;
	}

	return new Promise((resolve, reject) => {

		r.connect(options).then((connection) => {
			conn = connection;
			return r.dbList().run(conn);
		}).then((dbList) => {
			if (dbList.indexOf('badmars') == -1) {
				console.log('creating database');
				return r.dbCreate('badmars').run(conn);
			} else {
				console.log('database exists');
			}
		}).then(() => {
			r.db('badmars');
			console.log('processing tables');
			var initPromises = [];
			initPromises.push(exports.planet.init(conn));
			initPromises.push(exports.map.init(conn));
			Promise.all(initPromises).then(() => {
				logger.info("db ready");
				resolve();
			}).catch((err) => {
				reject(err);
			});
		});
	});

	return r.connect(options);
}
