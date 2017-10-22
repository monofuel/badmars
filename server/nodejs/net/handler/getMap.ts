
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../../util/context';
import Client from '../client';
import Unit from '../../unit/unit';
import sleep from '../../util/sleep';
import { sanitizeChunk, sanitizeUnit, sanitizePlanet, sanitizeUser } from '../../util/socketFilter';

type ChunkHash = string;

export default async function getMap(ctx: Context, client: Client): Promise<void> {
	const { db, logger } = ctx;
	const planetDB = await db.getPlanetDB(ctx, this.location.map);

	const units: Array<Unit> = await planetDB.unit.listPlayersUnits(ctx, client.user.uuid);
	const planet: any = sanitizePlanet(client.planet);
	planet.isSpawned = units.length !== 0;
	client.send('map', { map: planet });

	// HACK make sure 'map' arrives before data about the map
	await sleep(1000);

	const unitStats = await planetDB.unitStat.getAll(ctx);
	client.send('unitStats', { units: unitStats });

	const userList = await ctx.db.user.list(ctx);
	client.send('players', { players: userList.map(sanitizeUser) });

	// load chunks that user has units on
	const chunkSet: Set<string> = new Set();
	units.forEach((unit: Unit) => {
		unit.location.chunkHash.forEach((hash: ChunkHash) => {
			chunkSet.add(hash);
			client.planet.getNearbyChunkHashes(hash, 2).forEach((i: string): void => { chunkSet.add(i) });
		});
	});
	const list: ChunkHash[] = Array.from(chunkSet).slice(0, 10);
	await Promise.all(list.map(async (hash: ChunkHash): Promise<void> => {
		client.loadedChunks.push(hash);
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		const chunk = await client.planet.getChunk(ctx, x, y);
		const chunkUnits = await chunk.getUnits(ctx);
		client.send('chunk', { chunk: sanitizeChunk(chunk) });
		client.send('units', { units: chunkUnits.map((unit: Unit) => sanitizeUnit(unit, client.user.uuid))});
	}));
}
