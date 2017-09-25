
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { sanitizeChunk, sanitizeUnit } from '../../util/socketFilter';
import Context from '../../util/context';
import Client from '../client';
import Chunk from '../../map/chunk';
import { checkContext } from '../../util/logger';

export default async function getChunk(ctx: Context, client: Client, data: any): Promise<void> {
	checkContext(ctx, 'getChunk');
	const x = data.x || 0;
	const y = data.y || 0;

	const unitsOnly = data.unitsOnly;

	const chunk: Chunk = await client.planet.getChunk(ctx, x, y);
	if(!unitsOnly) {
		// ctx.logger.info(ctx, 'client getChunk', { x, y });
		client.send('chunk', { chunk: sanitizeChunk(chunk) });
	}

	const units = await chunk.getUnits(ctx);
	if(units.length > 0) {
		const sanitized = [];
		for(const unit of units) {
			if(!unit) {
				continue;
			}
			sanitized.push(sanitizeUnit(unit, client.user.uuid));
		}
		//TODO sanitize unit data
		client.send('units', { units: sanitized });
		client.loadedChunks.push(`${x}:${y}`);
		while (client.loadedChunks.length > 60) {
			client.loadedChunks.shift();
		}
	}
}