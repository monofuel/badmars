//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var Map = require('../map/map.js');

var r = require('rethinkdb');
var logger = require('../util/logger.js');


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

exports.getMap = async function getMap(name) {
	let profile = logger.startProfile('getMap');
	if (!name) {
		throw new Error('invalid map get');
	}
	let doc = await table.get(name).run(conn);
	if (!doc) {
		return null;
	}
	var map = new Map();
	map.clone(doc);
	logger.endProfile(profile);
	return map;
};

exports.registerListener = (name,func) => {
	table.get(name).changes().run(conn).then((cursor) => {
		cursor.each(func);
	});
};

exports.listNames = () => {
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	});
};

exports.saveMap = (map) => {
	return table.get(map.name).update(map).run(conn);
};
exports.createMap = (map) => {
	return table.insert(map,{conflict:"error"}).run(conn);
};

exports.removeMap = (name) => {
	return table.get(name).delete().run(conn);
};

exports.createRandomMap = (name) => {
	return exports.createMap(new Map(name));
};
