/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import {db} from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';

import Unit from '../unit';
import Map from '../../map/map';
import UnitStat from '../unitStat';

async function actionable(ctx: Context, unit: Unit, map: Map): Promise < boolean > {
	//TODO return if we can build or not
	return false;
}

//pass in the unit to update
//returns true if the unit was updated
async function simulate(ctx: Context, unit: Unit, map: Map) {
	if(unit.details.ghosting || !unit.construction) {
		return false;
	}
	if(unit.movable) {
		switch(unit.movable.layer) {
		case 'ground':
			return simulateGround(ctx, unit, map);
		default:
			return logger.errorWithInfo("unsupported constructor", {
				uuid: unit.uuid,
				type: unit.details.type,
				layer: unit.movable.layer
			});
		}
	}

	if(unit.stationary) {
		return simulateBuilding(ctx, unit, map);
	}

	logger.errorWithInfo("constructor not movable or stationary", {
		uuid: unit.uuid,
		type: unit.details.type
	});
}

async function simulateBuilding(ctx: Context, unit: Unit, map: Map): Promise < void > {
	if(!unit.construct) {
		return;
	}
	const queue = unit.construct.factoryQueue;
	//no units left to build
	if(!queue || queue.length === 0) {
		return;
	}

	let newUnitType: UnitType = queue[0].type;
	let unitInfo: UnitStat = unit.getTypeInfo(newUnitType);
	console.log('building: ' + newUnitType);

	if(queue[0].cost > 0) {
		if(await map.pullIron(ctx, unit, queue[0].cost)) {
			console.log('paying for unit');
			queue[0].cost = 0;

			//TODO this should not be called from outside unit
			await unit.update(ctx, {
				construct: {
					factoryQueue: queue
				}
			});
		} else {
			console.log('not enough resources');
		}
	}
	if(queue[0].cost === 0) {
		if(queue[0].remaining > 0) {
			queue[0].remaining--;
			await unit.update(ctx, {
				construct: {
					factoryQueue: queue
				}
			});
		} else {
			let newUnitData: FactoryOrder = await unit.popFactoryOrder();
			console.log(newUnitData);
			let tile = await map.getLoc(ctx, unit.location.x, unit.location.y);
			let newTile = await map.getNearestFreeTile(ctx, tile);

			//if spawn fails, should re-try with a new location
			let result = await map.factoryMakeUnit(ctx, newUnitType, unit.details.owner, newTile.x, newTile.y);
			if(result) {
				console.log('factory created ', newUnitType);
			} else {
				console.log('factory failed to create ', newUnitType);
			}
		}
	}

	return;
}


//TODO
//not tested yet
async function simulateGround(ctx: Context, unit: Unit, map: Map) {
	if(!unit.construct || !unit.storage) {
		return;
	}
	console.log('simulating constructor');
	let nearestGhost: ? Unit = null;
	let units: Array < Unit > = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
	map.sortByNearestUnit(units, unit);

	for(let nearbyUnit of units) {
		if(!nearbyUnit.details.ghosting) {
			continue;
		}

		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if(nearbyUnit.distance(unit) < nearbyUnit.details.size + 1.05) {
			nearestGhost = nearbyUnit;
			break;
		}
	}

	if(!nearestGhost) {
		//if there is no ghost next to this unit, find one.
		for(let nearbyUnit: Unit of units) {
			if(!nearbyUnit.details.ghosting) {
				return;
			}
			if(nearbyUnit.details.owner !== unit.details.owner) {
				return;
			}

			let center = await map.getLoc(ctx, nearbyUnit.location.x, nearbyUnit.location.y);
			let tile = await map.getNearestFreeTile(ctx, center, unit, true);

			//check if there are resources within range
			let iron_available = 0;
			units.forEach((nearbyUnit2: Unit) => {
				let distance = nearbyUnit2.distance(nearbyUnit);
				if(!nearbyUnit2.storage || !unit.storage) {
					return;
				}
				if(distance > unit.storage.transferRange && distance > nearbyUnit2.storage.transferRange) {
					return;
				}
				iron_available += nearbyUnit2.storage.iron;
			});
			if(iron_available > nearbyUnit.details.cost) {
				console.log('iron available', iron_available);
				console.log('unit cost', nearbyUnit.details.cost);
				unit.setDestination(ctx, tile.x, tile.y);
				console.log('builder pathing to ghost');
				return true;
			} else {
				console.log('not enough resources near ghost');
			}
		}

		return;
	}

	if(await map.pullIron(ctx, unit, nearestGhost.details.cost)) {
		console.log('paying for building');
		//TODO builder should halt and spend time building
		//should also make sure the area is clear
		let result = await nearestGhost.update(ctx, { details: { ghosting: false }, awake: true });
		return true;
	}
}

export default {
	actionable,
	simulate
}
