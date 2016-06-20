//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');

const unitKeyWhitelist = [
	'x',
	'y',
	'chunkX',
	'chunkY',
	'uuid',
	'type',
	'map',
	'iron',
	'fuel',
	'health',
	'tileHash',
	'chunkHash',
	'factoryQueue',
	'destination',
	'ghosting',
	'owner',
	'speed' //unit stats was being finnicky on the client TODO fix this
]

//TODO should break this off into a helper file
module.exports.sanitizeUnit = function sanitizeUnit(unit) {

	//TODO sanitized based on if user owns the unit

	//whitelist
	let sanitized = {}
	for (let key of unitKeyWhitelist) {
		sanitized[key] = unit[key];
	}
	return sanitized;
}
