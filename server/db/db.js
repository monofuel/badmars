//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');
var logger = require('../util/logger.js');
var helper = require('../util/helper.js');
var r = require('rethinkdb');

var DBChunk = require('./chunk.js');
var DBUnit = require('./unit.js');

exports.map = require('./map.js');
exports.user = require('./user.js');
exports.chat = require('./chat.js');
exports.event = require('./event.js');

exports.chunks = {};
exports.units = {};

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
		initPromises.push(exports.map.init(conn));
		initPromises.push(exports.chat.init(conn));
		initPromises.push(exports.event.init(conn));
		initPromises.push(exports.user.init(conn));
		return Promise.all(initPromises);
	}).then(() => {
		return exports.map.listNames();
	}).then((names) => {
		console.log('preparing chunks');
		var chunkPromises = [];
		for (var name of names) {
			var chunk = new DBChunk(conn, name);
			chunkPromises.push(chunk.init());
			exports.chunks[name] = chunk;
		}
		return Promise.all(chunkPromises).then(() => {
			return exports.map.listNames();
		});
	}).then((names) => {
		console.log('preparing units');
		var unitPromises = [];
		for (var name of names) {
			var unit = new DBUnit(conn, name);
			unitPromises.push(unit.init());
			exports.units[name] = unit;
		}
		return Promise.all(unitPromises);
	}).then(() => {
		return exports.map.createRandomMap('testmap').then(() => {
			console.log('created map testmap');
		});
	});
};

exports.safeCreateTable = async (tableName) => {

	//rethinkdb does not atomically create tables
	await helper.sleep(5000 * Math.random());
	let results = await r.tableList().contains(tableName)
	.do((exists) => {
		return r.branch(exists,
		{ table_created: 0 },
		r.tableCreate(tableName)
		)
	}).run(conn);
	if (results.table_created) {
		console.log('created table:' + tableName);
	}
}
