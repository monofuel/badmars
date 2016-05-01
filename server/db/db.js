//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');
var logger = require('../util/logger.js');
var r = require('rethinkdb');
var DBChunk = require('./chunk.js');

exports.planet = require('./planet.js');
exports.map = require('./map.js');

exports.chunks = {};

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

	return r.connect(options).then((connection) => {
		conn = connection;
		return r.dbList().run(conn);
	}).then((dbList) => {
		if (dbList.indexOf('badmars') == -1) {
			console.log('creating database');
			return r.dbCreate('badmars').run(conn);
		}
	}).then(() => {
		r.db('badmars');
		console.log('preparing tables');
		var initPromises = [];
		initPromises.push(exports.planet.init(conn));
		initPromises.push(exports.map.init(conn));
		return Promise.all(initPromises);
	}).then(() => {
		return exports.map.listNames();
	}).then((names) => {
		console.log('preparing chunks')
		var chunkPromises = [];
		for (var name of names) {
			var chunk = new DBChunk(conn, name);
			chunkPromises.push(chunk.init());
			exports.chunks[name] = chunk;
		}
		return Promise.all(chunkPromises);
	});
}
