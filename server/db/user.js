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

exports.listAllSanitizedUsers = () => {
	return table.run(conn).then((cursor) => {
		return cursor.toArray().then((list) => {
			var sanitized = [];
			for (var user of list){
				sanitized.push({
					name: user.name,
					color: user.color
				});
			}
			return sanitized;
		});
	});
};

exports.getUser = (name) => {
	return table.get(name).run(conn).then((doc) => {
		if (!doc) {
			return null;
		}
		var user = new User();
		user.clone(doc);
		return user;
	});
};

exports.createUser = (name,color) => {
	var user = new User(name,color);
	return table.insert(user,{conflict:"error", returnChanges: true}).run(conn);
};
