//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var Planet = require('../planet/planet.js');

var conn;
var table;

exports.init = (connection) => {
	conn = connection;

	return r.tableList().run(conn)
		.then((tableList) => {
			if (tableList.indexOf('planet') == -1) {
				console.log('creating planet table');
				return r.tableCreate('planet',{primaryKey: 'name'}).run(conn);
			}
		}).then(() => {
			table = r.table('planet');
		});
};

exports.listNames = () => {
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	});
};

exports.registerListener = (name,func) => {
	table.changes().run(conn).then((cursor) => {
		cursor.each(func);
	});
};

exports.getPlanet = (name) => {
	return table.get(name).run(conn).then((doc) => {
		if (!doc) {
			return null;
		}
		var planet = new Planet();
		planet.clone(doc);
		return planet;
	});
};

exports.savePlanet = (planet) => {
	return table.get(planet.name).update(planet).run(conn);
};

exports.createPlanet = (planet) => {
	return table.insert(planet,{conflict:"error"}).run(conn);
};


exports.removePlanetByName = (name) => {
	return table.get(name).delete().run(conn);
};

exports.createNewPlanet = (planetName,mapName) => {
	return exports.createPlanet(new Planet(planetName,mapName));
};
