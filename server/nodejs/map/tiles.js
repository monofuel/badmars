/* @flow */

// import _ from 'lodash';
import type MonoContext from '../util/monoContext';
import type PlanetLoc from './planetloc';
import Unit from '../unit/unit';
import { checkContext, DetailedError } from '../util/logger';


type TileMapType = {
	[key: string]: PlanetLoc
};

export function findOverlaps(tiles1: PlanetLoc[], tiles2: PlanetLoc[]): PlanetLoc[] {
	const results: PlanetLoc[] = [];
	for (const j of tiles1) {
		for (const k of tiles2) {
			if (j.equals(k)) {
				results.push(j);
			}
		}
	}
	return results;
}

export async function areUnitsAdjacent(ctx: MonoContext, unit1: Unit, unit2: Unit): Promise<boolean> {
	checkContext(ctx, 'areUnitsAdjacent');
	const tiles1: PlanetLoc[] = await unit1.getLocs(ctx);
	const tiles2: PlanetLoc[] = await unit2.getLocs(ctx);

	for (const j of tiles1) {
		for (const k of tiles2) {
			if (j.distance(k) - 1 < 0.01) {
				return true;
			}
		}
	}

	return false;
}

// find the nearest adjacent tile to unit2 that unit1 can reach
// if no tiles are open, the nearest occupied tile is picked
export async function getNearestAdjacentTile(ctx: MonoContext, unit1: Unit, unit2: Unit): Promise<PlanetLoc> {
	checkContext(ctx, 'getNearestFreeTile');
	const tiles1: PlanetLoc[] = await unit1.getLocs(ctx);
	const tiles2: PlanetLoc[] = await unit2.getLocs(ctx);

	if (await areUnitsAdjacent(ctx, unit1, unit2)) {
		return tiles1[0];
	}

	const adjacentTiles: TileMapType = {};

	for (const j of tiles2) {
		const tiles: PlanetLoc[] = await getAdjacentTiles(ctx, j);
		for (const k of tiles) {
			adjacentTiles[k.hash] = k;
		}
	}

	let nearest: ?PlanetLoc = undefined;
	let nearestOpen: ?PlanetLoc = undefined;
	for (const key of Object.keys(adjacentTiles)) {
		const tile = adjacentTiles[key];
		const tileDistance = tile.distance(tiles1[0]);
		if (!nearest || nearest.distance(tile) > tileDistance) {
			nearest = tile;
		}
		if (await tile.isOpen(ctx) && (!nearestOpen || nearestOpen.distance(tile) > tileDistance)) {
			nearestOpen = tile;
		}
	}
	if (!nearest) {
		throw new DetailedError('couldn\'t find a free tile near unit', { unit1: unit1.uuid, unit2: unit2.uuid });
	}

	return nearestOpen ? nearestOpen : nearest;
}

export async function getAdjacentTiles(ctx: MonoContext, loc: PlanetLoc): Promise<PlanetLoc[]> {
	const results: Promise<PlanetLoc>[] = [];
	results.push(loc.W(ctx));
	results.push(loc.E(ctx));
	results.push(loc.N(ctx));
	results.push(loc.S(ctx));
	return Promise.all(results);
}