
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { sanitizeChunk, sanitizeUnit } from '../../util/socketFilter';
import Context from '../../context';
import Client from '../client';
import Chunk from '../../map/chunk';
import db from '../../db';

export default async function getChunk(ctx: Context, client: Client, data: any): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, client.map.name);
	ctx.check('getChunk');
	const x = data.x || 0;
	const y = data.y || 0;

	const unitsOnly = data.unitsOnly;

	const chunk: Chunk = await client.planet.getChunk(ctx, x, y);
	if (!unitsOnly) {
		// ctx.logger.info(ctx, 'client getChunk', { x, y });
		client.send('chunk', { chunk: sanitizeChunk(chunk) });
	}
	const layer = await planetDB.chunkLayer.get(ctx, chunk.hash);
	const units = Object.values(await planetDB.unit.getBulk(ctx, Object.values(layer.units)));
	if (units.length > 0) {
		const sanitized = [];
		for (const unit of units) {
			if (!unit) {
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
