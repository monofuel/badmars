//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

import {Map} from '../map/map.js';

import r from 'rethinkdb';
import logger from '../util/logger.js';

const mapCache = {};

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

exports.listNames = async () => {
	return table.getField('name').coerceTo('array').run(conn);
};

exports.getMap = async function getMap(name) {
	if (!name) {
		throw new Error('missing map name');
	}
	let profile = logger.startProfile('getMap');
	if (mapCache[name] /*&& Date.now() - mapCache[name].lastUpdate < 2000*/) {
		logger.addSumStat('mapCacheHit',1);
		logger.endProfile(profile);
		return mapCache[name].map;
	} else {
		logger.addSumStat('mapCacheMissOrRefresh',1);
	}

	let doc = await table.get(name).run(conn);
	if (!doc) {
		return null;
	}
	var map = new Map();
	map.clone(doc);
	mapCache[name] = {
		lastUpdate: Date.now(),
		map: map
	};

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

exports.updateMap = async (name,patch) => {
	return await table.get(name).update(patch).run(conn);
};

exports.removeMap = (name) => {
	return table.get(name).delete().run(conn);
};

exports.createRandomMap = (name) => {
	return exports.createMap(new Map(name));
};
