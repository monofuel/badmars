/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const TABLE_NAME = 'chat';

import r from 'rethinkdb';
import db from './db';
import logger from '../util/logger';

var conn;
var table;

exports.init = async(connection) => {
	conn = connection;
	await db.safeCreateTable(TABLE_NAME);
	table = r.table(TABLE_NAME);
}

exports.watchChat = async(func) => {
	table.changes().run(conn).then((cursor) => {
		cursor.each(func);
	});
}

exports.sendChat = async(user, text, channel) => {
	let object = {
		uuid: user.uuid,
		channel,
		text,
		timestamp: Date.now()
	};

	await table.insert(object).run(conn);
}
