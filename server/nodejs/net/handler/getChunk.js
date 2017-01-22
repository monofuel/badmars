/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import filter from '../../util/socketFilter';
import Context from 'node-context';
import Client from '../client';
import Chunk from '../../map/chunk';

async function getChunk(ctx: Context, client: Client, data: Object) {
	var x = data.x || 0;
	var y = data.y || 0;

	const unitsOnly = data.unitsOnly;

	const chunk: Chunk = await client.planet.getChunk(ctx, x, y);
	if(!unitsOnly) {
		client.send('chunk', { chunk: filter.sanitizeChunk(chunk) });
	}

	const units = await chunk.getUnits();
	if(units.length > 0) {
		const sanitized = [];
		for(const unit of units) {
			if(!unit) {
				continue;
			}
			sanitized.push(filter.sanitizeUnit(unit));
		}
		//TODO sanitize unit data
		client.send('units', { units: sanitized });
	}
}

module.exports = getChunk;
