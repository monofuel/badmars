/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import { checkContext, DetailedError } from '../../util/logger';

import type Unit from '../unit';
import type Map from '../../map/map';

export default class constructionAI {
	nearestGhost: ?Unit;

	async actionable(ctx: MonoContext, unit: Unit, map: Map): Promise<boolean> {

		if(unit.details.ghosting || !unit.construct) {
			return false;
		}

		if (unit.movable) {
			switch (unit.movable.layer) {
			case 'ground':
				return this.checkGroundActionable(ctx, unit, map);
			}
		}
		if (unit.stationary) {
			return this.checkBuildingActionable(ctx, unit, map);
		}

		return false;
	}

	async checkGroundActionable(ctx: MonoContext, unit: Unit, map: Map): Promise<boolean> {
		if(!unit.construct || !unit.storage) {
			return false;
		}

		const units: Array<Unit> = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
		map.sortByNearestUnit(units, unit);

		for(const nearbyUnit of units) {
			if(!nearbyUnit.details.ghosting) {
				continue;
			}
			if(nearbyUnit.details.owner !== unit.details.owner) {
				continue;
			}
			this.nearestGhost = nearbyUnit;
			return true;
		}

		return false;
	}

	async checkBuildingActionable(ctx: MonoContext, unit: Unit): Promise<boolean> {
		if (!unit.construct) {
			return false;
		}

		const queue = unit.construct.factoryQueue;
		//no units left to build
		if(!queue || queue.length === 0) {
			return false;
		}

		// TODO should also check if there are enough resources in range
		return true;
	}

	//pass in the unit to update
	//returns true if the unit was updated
	async simulate(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
		checkContext(ctx, 'construction simulate');

		if(unit.movable) {
			switch(unit.movable.layer) {
			case 'ground':
				return this.simulateGround(ctx, unit, map);
			}
		}

		if(unit.stationary) {
			return this.simulateBuilding(ctx, unit, map);
		}

		throw new DetailedError('constructor not movable or stationary', {
			uuid: unit.uuid,
			type: unit.details.type
		});
	}

	async simulateBuilding(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
		if (!unit.construct) {
			return;
		}
		const queue = unit.construct.factoryQueue;

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

	async simulateGround(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
		if(!unit.construct || !unit.storage || !this.nearestGhost) {
			return;
		}
		const nearestGhost = this.nearestGhost;

		// check if the nearby ghost is close enough to build
		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if(nearestGhost.distance(unit) < nearestGhost.details.size + 1.05) {
			if(await map.pullIron(ctx, unit, nearestGhost.details.cost)) {
				ctx.logger.info(ctx, `${unit.details.type} building ${nearestGhost.details.type}`);
				//TODO builder should halt and spend time building
				//should also make sure the area is clear
				await nearestGhost.update(ctx, { details: { ghosting: false }, awake: true });
			}
		} else { // else if we need to move closer to the nearest ghost
			ctx.logger.info(ctx, `${unit.details.type} heading to ${nearestGhost.details.type}`);

			const center = await map.getLoc(ctx, nearestGhost.location.x, nearestGhost.location.y);
			const tile = await map.getNearestFreeTile(ctx, center, unit, true);
			if (!tile) {
				throw new DetailedError('no nearby open tile', { x: center.x, y: center.y });
			}

			//check if there are resources within range
			const units: Array<Unit> = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
			map.sortByNearestUnit(units, unit);

			let iron_available = 0;
			units.forEach((nearbyUnit2: Unit) => {
				const distance = nearbyUnit2.distance(nearestGhost);
				if(!nearbyUnit2.storage || !unit.storage) {
					return;
				}
				if(distance > unit.storage.transferRange && distance > nearbyUnit2.storage.transferRange) {
					return;
				}
				iron_available += nearbyUnit2.storage.iron;
			});
			if(iron_available > nearestGhost.details.cost) {
				unit.setDestination(ctx, tile.x, tile.y);
				return;
			}
		}
	}
}