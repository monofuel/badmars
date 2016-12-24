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

async function actionable(unit: Unit, map: Map): Promise < boolean > {
	return Promise.resolve(
		unit.details.type === 'mine' &&
		!unit.details.ghosting &&
		!!unit.storage
	)
}

async function simulate(unit: Unit, map: Map) {
	if(!unit.storage) {
		return;
	}

	if(unit.storage.resourceCooldown > 0) {
		unit.storage.resourceCooldown--;
		await unit.update({ storage: { resourceCooldown: unit.storage.resourceCooldown } });
	}
	if(unit.storage.resourceCooldown === 0) {
		await unit.update({ storage: { resourceCooldown: env.resourceTicks } });

		let tile: PlanetLoc = await map.getLocFromHash(unit.location.hash[0]);
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
			map.produceIron(unit, 10);
		} else if(resource.details.type === 'oil') {
			map.produceFuel(unit, 10);
		}

	}

	return true;
}

export default {
	actionable,
	simulate
}
