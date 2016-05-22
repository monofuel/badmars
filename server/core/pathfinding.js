//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var registeredMaps = [];

exports.init = () => {
	setInterval(registerListeners,1000);
};

function registerListeners() {
	db.map.listNames().then((name) => {
		if (registeredMaps.indexOf(name) == -1) {
			registeredMaps.push(name);
			db.units[name].registerPathListener(pathfind);
		}
	});
}

function pathfind(err,delta) {
	if (err) {
		logger.error(err);
	}

  if (!delta.new_val) {
		console.log('unit deleted: ' + delta.old_val.name);
		return;
	}

  console.log('unit updated');
  db.units[delta.new_val.map].getUnprocessedPath().then((unit) => {
    console.log('pathing for unit');
    //TODO
    //calculate the path for the unit
    //save the path back to the unit
  });
}
