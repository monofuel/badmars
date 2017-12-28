
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../../context';
import * as _ from 'lodash';
import db from '../../db';
import Client from '../client';
import sleep from '../../util/sleep';
import { listChunkUnits } from '../../map/chunk';
import { sanitizeChunk, sanitizeUnit, sanitizePlanet, sanitizeUser } from '../../util/socketFilter';
import { isUnitVisible } from '../../unit/unit';

type ChunkHash = string;

export default async function getMap(ctx: Context, client: Client): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, client.map.name);

	const units: Array<Unit> = await planetDB.unit.listPlayersUnits(ctx, client.user.uuid);
	const planet: any = sanitizePlanet(client.planet);
	planet.isSpawned = units.length !== 0;
	await client.send('map', { map: planet });

	const unitStats = await planetDB.unitStat.getAll(ctx);
	await client.send('unitStats', { units: unitStats });

	// TODO should only send users in planet.users[]
	const userList = await db.user.list(ctx);
	await client.send('players', { players: userList.map(sanitizeUser) });

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
		const chunk = await client.planet.getChunkOld(ctx, x, y);
		const chunkUnits = await listChunkUnits(ctx, chunk);
		await client.send('chunk', { chunk: sanitizeChunk(chunk) });
		await client.send('units', {
			units: _.compact(await Promise.all(chunkUnits.map(async (unit: Unit) => {
				// HACK for factory queues
				unit = _.cloneDeep(unit);
				if (unit.details.type === 'factory') {
					unit.construct.queue = await planetDB.factoryQueue.list(ctx, unit.uuid);
				}
				unit.visible = await isUnitVisible(ctx, unit, client.user);
				if (!unit.visible) {
					return;
				}
				client.visibleUnits[unit.uuid] = _.cloneDeep(unit);
				return sanitizeUnit(unit, client.user.uuid);
			})))
		});
	}));
}
