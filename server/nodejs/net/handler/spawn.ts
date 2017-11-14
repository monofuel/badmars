
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../../context';
import Client from '../client';
import db from '../../db';
import Unit from '../../unit/unit';
import { sanitizeChunk, sanitizeUnit } from '../../util/socketFilter';

type ChunkHash = string;

export default async function handleSpawn(ctx: Context, client: Client): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, client.map.name);

	let units: Array<Unit> = await planetDB.unit.listPlayersUnits(ctx, client.user.uuid);
	if (units.length > 0) {
		client.sendError(ctx, 'spawn', 'already have units');
		return;
	}

	await client.planet.spawnUser(ctx, client.user);
	units = await planetDB.unit.listPlayersUnits(ctx, client.user.uuid);

	client.send('spawn');

	// load chunks that user has units on
	const chunkSet = new Set();
	units.forEach((unit: Unit) => {
		unit.location.chunkHash.forEach((hash: ChunkHash) => {
			chunkSet.add(hash);
		});
	});
	const list: ChunkHash[] = Array.from(chunkSet).slice(0, 10);
	await Promise.all(list.map(async (hash: ChunkHash): Promise<void> => {
		client.loadedChunks.push(hash);
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		const chunk = await client.planet.getChunk(ctx, x, y);
		client.send('chunk', { chunk: sanitizeChunk(chunk) });
	}));
	client.send('units', { units: units.map((unit) => sanitizeUnit(unit, client.user.uuid)) });
}
