//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var Map = require('../map/map.js')

var r = require('rethinkdb');


var conn;
var table;

exports.init = (connection) => {
	conn = connection;

	return r.tableList().run(conn)
		.then((tableList) => {
			if (tableList.indexOf('map') == -1) {
				console.log('creating map table');
				return r.tableCreate('map').run(conn);
			} else {
				console.log('map table exists');
			}
		}).then(() => {
			table = r.table('map');
		});
}

exports.listNames = () => {
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	});
}

exports.removeMapByName = (name) => {
	return table.filter({
		name: name
	}).delete().run(conn)
}

exports.createRandomMap = (name) => {
	var map = new Map(name);
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	}).then((results) => {
		if (results.indexOf(name) != -1) {
			throw new Error("Map exists");
		}
	}).then(() => {
		table.insert(map).run(conn)
	});
}

exports.getMapByName = () => {

}
