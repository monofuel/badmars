/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const TABLE_NAME = 'event';

var r = require('rethinkdb');

var db = require('./db.js');
var logger = require('../util/logger.js');

var conn = null;
var table = null;

exports.init = async(connection) => {
	conn = connection;
	await db.safeCreateTable(TABLE_NAME);
	table = r.table(TABLE_NAME);
}

exports.watchEvents = async(func) => {
	table.changes().run(conn).then((cursor) => {
		cursor.each(func);
	});
}

exports.addEvent = async(object) => {
	if(!table) { //in case we try to log an event before db is ready
		return;
	}
	await table.insert(object).run(conn);
}
