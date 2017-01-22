/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import Unit from '../unit/unit';
import Chunk from '../map/chunk';

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

module.exports.sanitizeUnit = function sanitizeUnit(unit: Unit) {

	//TODO sanitized based on if user owns the unit

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

module.exports.sanitizeChunk = function sanitizeChunk(chunk: Object) {

	//whitelist
	const sanitized = {};
	for(const key of chunkKeyWhitelist) {
		sanitized[key] = chunk[key];
	}
	return sanitized;
};
