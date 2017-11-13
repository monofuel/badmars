
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db';
import Context from '../../context';
import { DetailedError } from '../../logger';

import PlanetLoc from '../../map/planetloc';
import Unit, { tickResourceCooldown } from '../unit';

export async function actionable(ctx: Context, unit: Unit): Promise<boolean> {
	return Promise.resolve(
		unit.details.type === 'mine' &&
		!unit.details.ghosting
	);
}

export async function simulate(ctx: Context, unit: Unit): Promise<void> {
	ctx.check('mine simulate');
	if (!unit.storage) {
		return;
	}
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);

	await tickResourceCooldown(ctx, unit);

	if (unit.storage.resourceCooldown === 0) {

		const tile: PlanetLoc = await planetDB.planet.getLocFromHash(ctx, unit.location.hash[0]);
		const unitsAtTile: Array<Unit> = await planetDB.planet.unitsTileCheck(ctx, tile);
		//get the iron or oil at the location
		let resource: null | Unit = null;
		for (const otherUnit of unitsAtTile) {
			if (otherUnit.details.type === 'iron' || otherUnit.details.type === 'oil') {
				resource = otherUnit;
			}
		}
		if (!resource) {
			throw new DetailedError('invalid mine without resource', {
				type: unit.details.type,
				hash: JSON.stringify(unit.location.hash)
			});
		}
		if (resource.details.type === 'iron') {
			planetDB.planet.produceResource(ctx, 'iron', unit, 1);
		} else if (resource.details.type === 'oil') {
			planetDB.planet.produceResource(ctx, 'fuel', unit, 1);
		}

	}

	return;
}
