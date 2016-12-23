/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb';
import User from '../user/user';

var conn;
var table;

exports.init = (connection) => {
	conn = connection;

	return r.tableList().run(conn)
		.then((tableList) => {
			if(tableList.indexOf('user') == -1) {
				console.log('creating user table');
				return r.tableCreate('user', {
					primaryKey: 'uuid'
				}).run(conn).then(() => {
					return r.table('user').indexCreate("name").run(conn);
				});
			}
		}).then(() => {
			table = r.table('user');
		});
};

exports.listAllSanitizedUsers = () => {
	return table.run(conn).then((cursor) => {
		return cursor.toArray().then((list) => {
			var sanitized = [];
			for(var user of list) {
				sanitized.push({
					uuid: user.uuid,
					name: user.name,
					color: user.color
				});
			}
			return sanitized;
		});
	});
};

exports.getUser = (name) => {
	return table.getAll(name, {
		index: "name"
	}).coerceTo('array').run(conn).then((docs) => {
		var doc = docs[0];
		if(!doc) {
			return null;
		}
		var user = new User();
		user.clone(doc);
		return user;
	});
};

exports.createUser = (name, color) => {
	var user = new User(name, color);
	return table.insert(user, {
		conflict: "error",
		returnChanges: true
	}).run(conn);
};

exports.updateUser = async(name, patch) => {
	let result = await table.getAll(name, { index: 'name' }).update(patch).run(conn);
	return result;
}

exports.deleteUser = async(name) => {
	return table.getAll(name, { index: 'name' }).delete().run(conn)
}
