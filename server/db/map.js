//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var Map = require('../map/map.js');

var r = require('rethinkdb');


var conn;
var table;

exports.init = (connection) => {
	conn = connection;

	return r.tableList().run(conn)
		.then((tableList) => {
			if (tableList.indexOf('map') == -1) {
				console.log('creating map table');
				return r.tableCreate('map',{primaryKey: 'name'}).run(conn);
			}
		}).then(() => {
			table = r.table('map');
		});
};

exports.listNames = () => {
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	});
};

exports.getMap = (name) => {
	return table.get(name).run(conn).then((doc) => {
		var map = new Map();
		map.clone(doc);
		return map;
	});
};

exports.saveMap = (map) => {
	return table.get(map.name).update(map).run(conn);
};

exports.removeMap = (name) => {
	return table.get(name).delete().run(conn);
};

exports.createRandomMap = (name) => {
	return exports.saveMap(new Map(name));
};
