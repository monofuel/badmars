//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var User = require('../user/user.js');

var conn;
var table;

exports.init = (connection) => {
	conn = connection;

	return r.tableList().run(conn)
		.then((tableList) => {
			if (tableList.indexOf('user') == -1) {
				console.log('creating user table');
				return r.tableCreate('user',{primaryKey: 'name'}).run(conn);
			}
		}).then(() => {
			table = r.table('user');
		});
};
