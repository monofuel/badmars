
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../../config/env';
import Context from '../../util/context';
import { checkContext, DetailedError } from '../../util/logger';

import PlanetLoc from '../../map/planetloc';
import Unit from '../unit';
import Map from '../../map/map';

export async function actionable(ctx: Context, unit: Unit, map: Map): Promise<boolean> {
	return Promise.resolve(
		unit.details.type === 'mine' &&
		!unit.details.ghosting
	);
}

export async function simulate(ctx: Context, unit: Unit, map: Map): Promise<void> {
	checkContext(ctx, 'mine simulate');
	if(!unit.storage) {
		return;
	}

	if(unit.storage.resourceCooldown > 0) {
		unit.storage.resourceCooldown--;
		await unit.update(ctx, { storage: { resourceCooldown: unit.storage.resourceCooldown } });
	}
	if(unit.storage.resourceCooldown === 0) {
		await unit.update(ctx, { storage: { resourceCooldown: env.resourceTicks } });

		const tile: PlanetLoc = await map.getLocFromHash(ctx, unit.location.hash[0]);
		const unitsAtTile: Array<Unit> = await map.unitsTileCheck(ctx, tile);
		//get the iron or oil at the location
		let resource: null | Unit = null;
		for(const otherUnit of unitsAtTile) {
			if(otherUnit.details.type === 'iron' || otherUnit.details.type === 'oil') {
				resource = otherUnit;
			}
		}
		if(!resource) {
			throw new DetailedError('invalid mine without resource', {
				type: unit.details.type,
				hash: JSON.stringify(unit.location.hash)
			});
		}
		if(resource.details.type === 'iron') {
			map.produceResource(ctx, 'iron', unit, 1);
		} else if(resource.details.type === 'oil') {
			map.produceResource(ctx, 'fuel', unit, 1);
		}

	}

	return;
}
