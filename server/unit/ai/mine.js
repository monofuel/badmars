/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

import PlanetLoc from '../../map/planetloc';
import Unit from '../unit';
import Map from '../../map/map';

async function actionable(ctx: Context, unit: Unit, map: Map): Promise < boolean > {
	return Promise.resolve(
		unit.details.type === 'mine' &&
		!unit.details.ghosting &&
		!!unit.storage
	)
}

async function simulate(ctx: Context, unit: Unit, map: Map) {
	if(!unit.storage) {
		return; // shouldn't happen after actionable() check
	}

	if(unit.storage.resourceCooldown > 0) {
		unit.storage.resourceCooldown--;
		await unit.update(ctx, { storage: { resourceCooldown: unit.storage.resourceCooldown } });
	}
	if(unit.storage.resourceCooldown === 0) {
		await unit.update(ctx, { storage: { resourceCooldown: env.resourceTicks } });

		let tile: PlanetLoc = await map.getLocFromHash(ctx, unit.location.hash[0]);
		let unitsAtTile: Array < Unit > = await map.unitsTileCheck(tile);
		//get the iron or oil at the location
		let resource: ? Unit = null;
		for(let otherUnit of unitsAtTile) {
			if(otherUnit.details.type === 'iron' || otherUnit.details.type === 'oil') {
				resource = otherUnit;
			}
		}
		if(!resource) {
			//invalid mine
			return logger.errorWithInfo('invalid mine without resource', {
				type: unit.details.type,
				hash: unit.location.hash
			})
		}
		if(resource.details.type === 'iron') {
			map.produceIron(ctx, unit, 10);
		} else if(resource.details.type === 'oil') {
			map.produceFuel(ctx, unit, 10);
		}

	}

	return true;
}

export default {
	actionable,
	simulate
}
