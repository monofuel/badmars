

// import _ from 'lodash';
import Context from '../context';
import PlanetLoc from './planetloc';
import Unit, { getUnitLocs } from '../unit/unit';
import { DetailedError } from '../logger';


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

export async function areUnitsAdjacent(ctx: Context, unit1: Unit, unit2: Unit): Promise<boolean> {
	ctx.check('areUnitsAdjacent');
	const tiles1: PlanetLoc[] = await getUnitLocs(ctx, unit1);
	const tiles2: PlanetLoc[] = await getUnitLocs(ctx, unit2);

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
export async function getNearestAdjacentTile(ctx: Context, unit1: Unit, unit2: Unit): Promise<PlanetLoc> {
	ctx.check('getNearestFreeTile');
	const tiles1: PlanetLoc[] = await getUnitLocs(ctx, unit1);
	const tiles2: PlanetLoc[] = await getUnitLocs(ctx, unit2);

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

	let nearest: null | PlanetLoc;
	let nearestOpen: null | PlanetLoc;
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

export async function getAdjacentTiles(ctx: Context, loc: PlanetLoc): Promise<PlanetLoc[]> {
	const results: Promise<PlanetLoc>[] = [];
	results.push(loc.W(ctx));
	results.push(loc.E(ctx));
	results.push(loc.N(ctx));
	results.push(loc.S(ctx));
	return Promise.all(results);
}