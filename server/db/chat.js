//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const TABLE_NAME = 'chat';

var r = require('rethinkdb');
var db = require('./db.js');
var logger = require('../util/logger.js');

var conn;
var table;

exports.init = async (connection) => {
	conn = connection;
	await db.safeCreateTable(TABLE_NAME);
	table = r.table(TABLE_NAME);
}

exports.watchChat = async (func) => {
	table.changes().run(conn).then((cursor) => {
		cursor.each(func);
	});
}

exports.sendChat = async (user, text, channel) => {
	let object = {
		uuid: user.uuid,
		channel,
		text,
		timestamp: Date.now()
	};

	await table.insert(object).run(conn);
}
