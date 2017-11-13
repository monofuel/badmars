
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db';
import Context from '../../context';
import logger, { DetailedError } from '../../logger';
import Unit, { unitDistance, popFactoryOrder } from '../unit';

import UnitAI from './';

type UnitType = string;

export default class constructionAI implements UnitAI {
	nearestGhost: null | Unit;

	async actionable(ctx: Context, unit: Unit): Promise<boolean> {

		if (unit.details.ghosting || !unit.construct) {
			return false;
		}

		if (unit.movable) {
			switch (unit.movable.layer) {
				case 'ground':
					return this.checkGroundActionable(ctx, unit);
			}
		}
		if (unit.stationary) {
			return this.checkBuildingActionable(ctx, unit);
		}

		return false;
	}

	async checkGroundActionable(ctx: Context, unit: Unit): Promise<boolean> {
		const planetDB = await db.getPlanetDB(ctx, unit.location.map);
		if (!unit.construct || !unit.storage) {
			return false;
		}

		const units: Array<Unit> = await planetDB.planet.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
		planetDB.planet.sortByNearestUnit(units, unit);

		for (const nearbyUnit of units) {
			if (!nearbyUnit.details.ghosting) {
				continue;
			}
			if (nearbyUnit.details.owner !== unit.details.owner) {
				continue;
			}
			this.nearestGhost = nearbyUnit;
			return true;
		}

		return false;
	}

	async checkBuildingActionable(ctx: Context, unit: Unit): Promise<boolean> {
		if (!unit.construct) {
			return false;
		}

		const queue = unit.construct.factoryQueue;
		//no units left to build
		if (!queue || queue.length === 0) {
			return false;
		}

		// TODO should also check if there are enough resources in range
		return true;
	}

	//pass in the unit to update
	//returns true if the unit was updated
	async simulate(ctx: Context, unit: Unit): Promise<void> {
		ctx.check('construction simulate');

		if (unit.movable) {
			switch (unit.movable.layer) {
				case 'ground':
					return this.simulateGround(ctx, unit);
			}
		}

		if (unit.stationary) {
			return this.simulateBuilding(ctx, unit);
		}

		throw new DetailedError('constructor not movable or stationary', {
			uuid: unit.uuid,
			type: unit.details.type
		});
	}

	async simulateBuilding(ctx: Context, unit: Unit): Promise<void> {
		const planetDB = await db.getPlanetDB(ctx, unit.location.map);
		if (!unit.construct) {
			return;
		}
		const queue = unit.construct.factoryQueue;

		const newUnitType: UnitType = queue[0].type;
		//const unitInfo: UnitStat = await unit.getTypeInfo(newUnitType);
		logger.info(ctx, 'constructing', { type: newUnitType });

		if (queue[0].cost > 0) {
			if (await planetDB.planet.pullResource(ctx, 'iron', unit, queue[0].cost)) {
				queue[0].cost = 0;

				//TODO this should not be called from outside unit
				await unit.update(ctx, {
					construct: {
						factoryQueue: queue
					}
				});
			}
		}
		if (queue[0].cost === 0) {
			if (queue[0].remaining > 0) {
				queue[0].remaining--;
				await unit.update(ctx, {
					construct: {
						factoryQueue: queue
					}
				});
			} else {
				await popFactoryOrder(ctx, unit);
				const tile = await map.getLoc(ctx, unit.location.x, unit.location.y);
				const newTile = await map.getNearestFreeTile(ctx, tile);
				if (!newTile) {
					throw new DetailedError('failed to find open tile', { uuid: unit.uuid });
				}

				//if spawn fails, should re-try with a new location
				const result = await map.factoryMakeUnit(ctx, newUnitType, unit.details.owner, newTile.x, newTile.y);
				if (!result) {
					throw new DetailedError('factory failed to create unit', { newUnitType, uuid: unit.uuid });
				}
			}
		}

		return;
	}

	async simulateGround(ctx: Context, unit: Unit): Promise<void> {
		if (!unit.construct || !unit.storage || !this.nearestGhost) {
			return;
		}
		const nearestGhost = this.nearestGhost;

		// check if the nearby ghost is close enough to build
		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if (unitDistance(unit, nearestGhost) < nearestGhost.details.size + 1.05) {
			if (await map.pullResource(ctx, 'iron', unit, nearestGhost.details.cost)) {
				logger.info(ctx, `${unit.details.type} building ${nearestGhost.details.type}`);
				//TODO builder should halt and spend time building
				//should also make sure the area is clear
				await nearestGhost.update(ctx, { details: { ghosting: false }, awake: true });
			}
		} else { // else if we need to move closer to the nearest ghost
			logger.info(ctx, `${unit.details.type} heading to ${nearestGhost.details.type}`);

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
				const distance = unitDistance(nearestGhost, nearbyUnit2);
				if (!nearbyUnit2.storage || !unit.storage) {
					return;
				}
				if (distance > unit.storage.transferRange && distance > nearbyUnit2.storage.transferRange) {
					return;
				}
				iron_available += nearbyUnit2.storage.iron;
			});
			if (iron_available > nearestGhost.details.cost) {
				setDestination(ctx, unit, tile.x, tile.y);
				return;
			}
		}
	}
}