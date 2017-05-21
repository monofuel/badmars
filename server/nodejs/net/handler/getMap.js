/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type MonoContext from '../../util/monoContext';
import type Client from '../client';
import type Unit from '../../unit/unit';
import { sanitizeChunk, sanitizeUnit } from '../../util/socketFilter';

export default async function getMap(ctx: MonoContext, client: Client): Promise<void> {
	const units: Array<Unit> = await ctx.db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	client.planet.isSpawned = units.length !== 0;
	client.send('map', { map: client.planet });

	const unitStats = await ctx.db.unitStats[client.planet.name].getAll(ctx);
	client.send('unitStats', { units: unitStats });

	const userList = await ctx.db.user.listAllSanitizedUsers();
	client.send('players', { players: userList });

	// TODO check user location and get chunks near it

	// if we don't know the users location, default to chunks the user has units on

	// load chunks that user has units on
	const chunkSet = new Set();
	units.forEach((unit: Unit) => {
		unit.location.chunkHash.forEach((hash: ChunkHash) => {
			chunkSet.add(hash);
		});
	});
	const list: ChunkHash[] = Array.from(chunkSet).slice(0, 10);
	console.log('got chunks: ', list);
	await Promise.all(list.map(async (hash: ChunkHash): Promise<void> => {
		client.loadedChunks.push(hash);
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		const chunk = await client.planet.getChunk(ctx, x, y);
		console.log('sending chunk');
		client.send('chunk', { chunk: sanitizeChunk(chunk) });
	}));
	console.log('sending units');
	client.send('units', { units: units.map((unit) => sanitizeUnit(unit, client.user.uuid))});
}
