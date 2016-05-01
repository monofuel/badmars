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
}

exports.listNames = () => {
	return table.getField('name').run(conn).then((cursor) => {
		return cursor.toArray();
	});
}
exports.getPlanet = (name) => {
	return table.get(name).run(conn);
}

exports.removePlanetByName = (name) => {
	return table.get(name).delete().run(conn)
}

exports.createPlanet = (planetName,mapName) => {
	var planet = new Planet(planetName,mapName);
	return table.insert(planet).run(conn);
}
