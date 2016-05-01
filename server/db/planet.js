//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var hat = require('hat');
var r = require('rethinkdb');

var conn;
var table;

exports.init = (connection) => {
	conn = connection;

	return r.tableList().run(conn)
	.then((tableList) => {
		if (tableList.indexOf('planet') == -1) {
			console.log('creating planet table');
			return r.tableCreate('planet').run(conn);
		} else {
			console.log('planet table exists');
		}
	}).then(() => {
		table = r.table('planet');
	});
}

exports.listNames = () => {
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	});
}
