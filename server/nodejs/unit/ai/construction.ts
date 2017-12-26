
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db';
import Context from '../../context';
import logger, { DetailedError } from '../../logger';
import { unitDistance, popFactoryOrder, setConstructing, setUnitDestination, setBuilt, tickConstruction } from '../unit';

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
		const planetDB = await db.getPlanetDB(ctx, unit.location.map);

		const queue = await planetDB.factoryQueue.list(ctx, unit.uuid);
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
		if (!unit.construct.constructing) {
			const peek = await planetDB.factoryQueue.peek(ctx, unit.uuid);
			const unitInfo = await planetDB.unitStat.get(ctx, peek.type);
			if (!await planetDB.planet.pullResource(ctx, 'iron', unit, unitInfo.details.cost)) {
				return;
			}
			// HACK
			// there's an issue if the queue changes between the peek and now
			// this shouldn't ever happen (the unit should only be processed once per tick)
			// but this would create an odd situation
			const next = await planetDB.factoryQueue.pop(ctx, unit.uuid);
			if (!next) {
				logger.info(ctx, 'nothing left in factory queue', { uuid: unit.uuid });
				return;
			}
			if (next !== peek) {
				logger.info(ctx, 'construction foobar', { next: next.type, peek: peek.type });
			}
			logger.info(ctx, 'popped unit off factory queue', { uuid: unit.uuid, next });

			const constructing = {
				type: next.type,
				remaining: unitInfo.details.buildTime,
			};
			await setConstructing(ctx, unit, constructing);
		}

		const constructing = unit.construct.constructing;
		logger.info(ctx, 'constructing unit', { uuid: unit.uuid, constructing });
		await tickConstruction(ctx, unit);
		if (unit.construct.constructing.remaining === 0) {

		}

		const tile = await planetDB.planet.getLoc(ctx, unit.location.x, unit.location.y);
		const newTile = await planetDB.planet.getNearestFreeTile(ctx, tile, unit, true);
		if (!newTile) {
			throw new DetailedError('failed to find open tile', { uuid: unit.uuid });
		}

		// TODO if spawn fails, should re-try with a new location
		await setConstructing(ctx, unit, null);
		const result = await planetDB.planet.factoryMakeUnit(ctx, constructing.type, unit.details.owner, newTile.x, newTile.y);
		if (!result) {
			throw new DetailedError('factory failed to create unit', { type: constructing.type, uuid: unit.uuid });
		}
		return;
	}

	async simulateGround(ctx: Context, unit: Unit): Promise<void> {
		const planetDB = await db.getPlanetDB(ctx, unit.location.map);
		if (!unit.construct || !unit.storage || !this.nearestGhost) {
			return;
		}
		const nearestGhost = this.nearestGhost;
		const distance = unitDistance(unit, nearestGhost)
		if (distance < nearestGhost.details.size + 1.05) {
			if (await planetDB.planet.pullResource(ctx, 'iron', unit, nearestGhost.details.cost)) {
				logger.info(ctx, `${unit.details.type} building ${nearestGhost.details.type}`);
				//TODO builder should halt and spend time building
				//should also make sure the area is clear
				await setBuilt(ctx, nearestGhost);
			} else {
				logger.info(ctx, `${unit.details.type} waiting on resources`)
			}
		} else { // else if we need to move closer to the nearest ghost

			const center = await planetDB.planet.getLoc(ctx, nearestGhost.location.x, nearestGhost.location.y);
			const tile = await planetDB.planet.getNearestFreeTile(ctx, center, unit, true);
			if (!tile) {
				throw new DetailedError('no nearby open tile', { x: center.x, y: center.y });
			}

			//check if there are resources within range
			const units: Array<Unit> = await planetDB.planet.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
			planetDB.planet.sortByNearestUnit(units, unit);

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
				logger.info(ctx, `${unit.details.type} heading to ${nearestGhost.details.type}`);
				setUnitDestination(ctx, unit, tile.x, tile.y);
				return;
			} else {

			}
		}
	}
}