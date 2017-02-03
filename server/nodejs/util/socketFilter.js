/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type Unit from '../unit/unit';

const unitKeyWhitelist = [
	'x',
	'y',
	'chunkX',
	'chunkY',
	'uuid',
	'type',
	'iron',
	'fuel',
	'health',
	'tileHash',
	'chunkHash',
	'factoryQueue',
	'destination',
	'ghosting',
	'owner'
];

module.exports.sanitizeUnit = function sanitizeUnit(unit: Unit): Object {

	//TODO sanitized based on if user owns the unit
	//TODO this needs to be re-written for unit changes

	//whitelist
	const sanitized = {};
	for(const key of unitKeyWhitelist) {
		// $FlowFixMe: hiding this issue for now
		sanitized[key] = unit[key];
	}
	return sanitized;
};

const chunkKeyWhitelist = [
	'x',
	'y',
	'hash',
	'map',
	'grid',
	'navGrid',
	'chunkSize'
];

module.exports.sanitizeChunk = function sanitizeChunk(chunk: Object): Object {

	//whitelist
	const sanitized = {};
	for(const key of chunkKeyWhitelist) {
		sanitized[key] = chunk[key];
	}
	return sanitized;
};
