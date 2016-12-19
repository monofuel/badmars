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
import DBUnitStat from './unitStat.js';

exports.map = require('./map.js');
exports.user = require('./user.js');
exports.chat = require('./chat.js');
exports.event = require('./event.js');

exports.chunks = {};
exports.units = {};
exports.unitStats = {};

var conn;

exports.init = async function init() {

	const options = {
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
	try {
		conn = await r.connect(options);
	} catch (err) {
		logger.error(err);
		console.log('failed to connect to DB, retrying in 5 seconds');
		await helper.sleep(5000);
		return exports.init();
	}
	const dbList = await r.dbList().run(conn);

	if (dbList.indexOf('badmars') == -1) {
		console.log('creating database');
		await r.dbCreate('badmars').run(conn);
	}

	r.db('badmars');
	//console.log('preparing tables');
	await Promise.all([
		exports.map.init(conn),
		exports.chat.init(conn),
		exports.event.init(conn),
		exports.user.init(conn)
	]);

	const mapNames = await exports.map.listNames();

	//console.log('preparing chunks');
	var chunkPromises = [];
	for (var name of mapNames) {
		var chunk = new DBChunk(conn, name);
		chunkPromises.push(chunk.init());
		exports.chunks[name] = chunk;
	}
	await  Promise.all(chunkPromises);


	//console.log('preparing units');
	var unitPromises = [];
	for (var name of mapNames) {
		var unit = new DBUnit(conn, name);
		unitPromises.push(unit.init());
		exports.units[name] = unit;
	}
	await Promise.all(unitPromises);

	var unitStatPromises = [];
	for (var name of mapNames) {
		var unitStat = new DBUnitStat(conn, name);
		unitStatPromises.push(unitStat.init());
		exports.unitStats[name] = unitStat;
	}
	await Promise.all(unitStatPromises);


	await exports.map.createRandomMap('testmap');
	//console.log('created map testmap');
};
exports.close = async () => {
	return conn.close()
}

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
