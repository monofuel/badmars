/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import { checkContext, DetailedError } from '../../util/logger';

import type Unit from '../unit';
import type Map from '../../map/map';

export async function actionable(): Promise<boolean> {
	//TODO return if we can build or not
	return false;
}

//pass in the unit to update
//returns true if the unit was updated
export async function simulate(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
	checkContext(ctx, 'construction simulate');
	if(unit.details.ghosting || !unit.construction) {
		return;
	}
	if(unit.movable) {
		switch(unit.movable.layer) {
		case 'ground':
			return simulateGround(ctx, unit, map);
		default:
			throw new DetailedError('unsupported constructor', {
				uuid: unit.uuid,
				type: unit.details.type,
				layer: unit.movable.layer
			});
		}
	}

	if(unit.stationary) {
		return simulateBuilding(ctx, unit, map);
	}

	throw new DetailedError('constructor not movable or stationary', {
		uuid: unit.uuid,
		type: unit.details.type
	});
}

async function simulateBuilding(ctx: Context, unit: Unit, map: Map): Promise<void> {
	if(!unit.construct) {
		return;
	}
	const queue = unit.construct.factoryQueue;
	//no units left to build
	if(!queue || queue.length === 0) {
		return;
	}

	const newUnitType: UnitType = queue[0].type;
	//const unitInfo: UnitStat = await unit.getTypeInfo(newUnitType);
	ctx.logger.info(ctx, 'constructing', { type: newUnitType });

	if(queue[0].cost > 0) {
		if(await map.pullIron(ctx, unit, queue[0].cost)) {
			queue[0].cost = 0;

			//TODO this should not be called from outside unit
			await unit.update(ctx, {
				construct: {
					factoryQueue: queue
				}
			});
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
			await unit.popFactoryOrder(ctx);
			const tile = await map.getLoc(ctx, unit.location.x, unit.location.y);
			const newTile = await map.getNearestFreeTile(ctx, tile);
			if (!newTile) {
				throw new DetailedError('failed to find open tile', {uuid: unit.uuid});
			}

			//if spawn fails, should re-try with a new location
			const result = await map.factoryMakeUnit(ctx, newUnitType, unit.details.owner, newTile.x, newTile.y);
			if(!result) {
				throw new DetailedError('factory failed to create unit', {newUnitType, uuid: unit.uuid});
			}
		}
	}

	return;
}


//TODO
//not tested yet
async function simulateGround(ctx: Context, unit: Unit, map: Map): Promise<void> {
	if(!unit.construct || !unit.storage) {
		return;
	}
	let nearestGhost: ? Unit = null;
	const units: Array<Unit> = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
	map.sortByNearestUnit(units, unit);

	for(const nearbyUnit of units) {
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
		for(const nearbyUnit: Unit of units) {
			if(!nearbyUnit.details.ghosting) {
				return;
			}
			if(nearbyUnit.details.owner !== unit.details.owner) {
				return;
			}

			const center = await map.getLoc(ctx, nearbyUnit.location.x, nearbyUnit.location.y);
			const tile = await map.getNearestFreeTile(ctx, center, unit, true);

			//check if there are resources within range
			let iron_available = 0;
			units.forEach((nearbyUnit2: Unit) => {
				const distance = nearbyUnit2.distance(nearbyUnit);
				if(!nearbyUnit2.storage || !unit.storage) {
					return;
				}
				if(distance > unit.storage.transferRange && distance > nearbyUnit2.storage.transferRange) {
					return;
				}
				iron_available += nearbyUnit2.storage.iron;
			});
			if(iron_available > nearbyUnit.details.cost) {
				unit.setDestination(ctx, tile.x, tile.y);
				return;
			}
		}

		return;
	}

	if(await map.pullIron(ctx, unit, nearestGhost.details.cost)) {
		//TODO builder should halt and spend time building
		//should also make sure the area is clear
		await nearestGhost.update(ctx, { details: { ghosting: false }, awake: true });
		return;
	}
}