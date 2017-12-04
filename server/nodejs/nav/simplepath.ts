import logger from '../logger';
import db from '../db';
import Context from '../context';
import PlanetLoc from '../map/planetloc';
import sleep from '../util/sleep';
import { LAND } from '../map/tiletypes';

export default async function SimplePath(ctx: Context, start: PlanetLoc, dest: PlanetLoc): Promise<Dir[]> {
	const planetDB = await db.getPlanetDB(ctx, start.map.name);
	const map = planetDB.planet;

	const path: Dir[] = [];

	let tile = start;
	for (let i = 0; i < ctx.env.pathComplexityLimit; i++) {
		await sleep(1);
		if (tile.x < dest.x) {
			const next = await tile.E(ctx);
			if (next.tileType === LAND) {
				path.push('E');
				tile = next;
			}
		}
		if (tile.x > dest.x) {
			const next = await tile.W(ctx);
			if (next.tileType === LAND) {
				path.push('W');
				tile = next;
			}
		}
		if (tile.y < dest.y) {
			const next = await tile.N(ctx);
			if (next.tileType === LAND) {
				path.push('N');
				tile = next;
			}
		}
		if (tile.y > dest.y) {
			const next = await tile.S(ctx);
			if (next.tileType === LAND) {
				path.push('S');
				tile = next;
			}
		}

	}

	return path;
}