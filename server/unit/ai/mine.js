/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

import Unit from '../unit';
import Map from '../../map/map';

async function actionable(unit: Unit, map: Map): Promise < boolean > {
	return Promise.resolve(unit.details.type === 'mine' && !unit.details.ghosting)
}

async function simulate(unit: Unit, map: Map) {

	if(unit.resourceCooldown > 0) {
		unit.resourceCooldown--;
		await unit.updateUnit({ resourceCooldown: unit.resourceCooldown });
	}
	if(unit.resourceCooldown === 0) {
		await unit.updateUnit({ resourceCooldown: 10 });

		let tile = await map.getLocFromHash(unit.tileHash[0]);
		let unitsAtTile = await map.unitsTileCheck(tile);
		//get the iron or oil at the location
		let resource = null;
		for(let otherUnit of unitsAtTile) {
			if(otherUnit.type === 'iron' || otherUnit.type === 'oil') {
				resource = otherUnit;
			}
		}
		if(!resource) {
			//invalid mine
			console.log('invalid mine: ' + unit.tileHash);
			return
		}
		if(resource.type === 'iron') {
			map.produceIron(unit, 10);
		} else if(resource.type === 'oil') {
			map.produceFuel(unit, 10);
		}

	}

	return true;
}

export default {
	actionable,
	simulate
}
