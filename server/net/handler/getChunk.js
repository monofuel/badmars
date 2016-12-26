/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import filter from '../../util/socketFilter';

async function getChunk(client, data) {
	var x = data.x || 0;
	var y = data.y || 0;

	let unitsOnly = data.unitsOnly;

	let chunk = await client.planet.getChunk(x, y);
	if(!unitsOnly) {
		client.send('chunk', { chunk: filter.sanitizeChunk(chunk) });
	}

	let units = await chunk.getUnits();
	if(units.length > 0) {
		let sanitized = [];
		for(let unit of units) {
			if(!unit) {
				continue;
			}
			sanitized.push(filter.sanitizeUnit(unit));
		}
		//TODO sanitize unit data
		client.send('units', { units: sanitized });
	}
};

module.exports = getChunk;
