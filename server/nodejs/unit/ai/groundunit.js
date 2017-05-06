/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import { checkContext, WrappedError } from '../../util/logger';

import PlanetLoc from '../../map/planetloc';
import DIRECTION from '../../map/directions';
import type Unit from '../unit';
import type Map from '../../map/map';


export async function actionable(ctx: MonoContext, unit: Unit): Promise<boolean> {
	if (!unit.movable || !unit.storage) {
		return false;
	}

	// TODO should refactor transferGoal to be a regular goal/destination
	if (unit.movable.transferGoal && unit.movable.transferGoal.uuid) {
		return true;
	}

	if (!unit.movable.path) {
		return false;
	}
	if (!unit.movable.destination) {
		return false;
	}
	return true;
}

export async function simulate(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
	checkContext(ctx, 'groundUnit simulate');

	if(!unit.movable || !unit.storage) {
		return;
	}

	if(await unit.tickMovement(ctx)) {
		console.log('movement cooldown: ' + unit.movable.movementCooldown);
		return;
	}

	if(!unit.movable.path || unit.movable.path.length === 0 || !unit.movable.destination) {

		//check if they are trying to transfer resources.
		//if they are, do it.
		if(!unit.movable.transferGoal || !unit.movable.transferGoal.uuid || (unit.movable.transferGoal.iron || 0 === 0 && unit.movable.transferGoal.oil || 0 === 0)) {
			if(unit.details.type === 'transport') {
				//wake up nearby ghost builders
				const units: Array<Unit> = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
				for(const nearby: Unit of units) {
					if(nearby.details.type === 'builder') {
						await nearby.update(ctx, { awake: true });
					}
				}
			}

			return;
		}
		const transferUnit: Unit = await ctx.db.units[map.name].getUnit(ctx, unit.movable.transferGoal.uuid);
		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if(transferUnit.distance(unit) > Math.max(unit.details.size, transferUnit.details.size) + 1.05) {
			//if it is not nearby, keep pathing.
			const tiles: Array<PlanetLoc> = await transferUnit.getLocs(ctx);
			const tile = await map.getNearestFreeTile(ctx, tiles[0], unit, true);
			if (!tile) {
				return;
			}
			unit.setDestination(ctx, tile.x, tile.y);

			return;
		}
		if(!unit.movable || !unit.storage || !unit.storage.transferGoal || !transferUnit.storage) {
			return;
		}

		//otherwise we are close enough to transfer
		let ironGoal = unit.storage.transferGoal.iron || 0;
		let fuelGoal = unit.storage.transferGoal.fuel || 0;

		if(!unit.movable || !unit.storage || !unit.storage.transferGoal || !transferUnit.storage) {
			return;
		}
		if(ironGoal > 0) {
			ironGoal = Math.min(ironGoal, transferUnit.storage.iron, unit.storage.maxIron - unit.storage.iron);
			//transfering from transferUnit to unit
			if(ironGoal !== 0 && await transferUnit.takeIron(ctx, ironGoal)) {
				let remainder = ironGoal - await unit.addIron(ctx, ironGoal);
				if(remainder !== 0) {
					remainder = ironGoal - await transferUnit.addIron(ctx, remainder);
					if(remainder !== 0) {
						//console.log('surplus iron lost ', remainder);
					}
				}
			} else if(ironGoal !== 0) {
				//console.log('iron transfer failed.');
				return;
			}
		} else if(ironGoal < 0) {
			//transfering from unit to transferUnit
			ironGoal = -ironGoal;
			ironGoal = Math.min(ironGoal, unit.storage.iron, transferUnit.storage.maxIron - transferUnit.storage.iron);
			//transfering from transferUnit to unit
			if(ironGoal !== 0 && await unit.takeIron(ctx, ironGoal)) {
				let remainder = ironGoal - await transferUnit.addIron(ctx, ironGoal);
				if(remainder !== 0) {
					remainder = ironGoal - await unit.addIron(ctx, remainder);
					if(remainder !== 0) {
						//console.log('surplus iron lost ', remainder);
					}
				}
			} else if(ironGoal !== 0) {
				//console.log('iron transfer failed.');
				return;
			}
		}
		unit.setTransferGoal(ctx, transferUnit.uuid, 0, fuelGoal);

		if(!unit.movable || !unit.storage || !unit.storage.transferGoal || !transferUnit.storage) {
			return;
		}

		if(fuelGoal > 0) {
			fuelGoal = Math.min(fuelGoal, transferUnit.storage.fuel, unit.storage.maxFuel - unit.storage.fuel);
			//transfering from transferUnit to unit
			if(fuelGoal !== 0 && await transferUnit.takeFuel(ctx, fuelGoal)) {
				let remainder = fuelGoal - await unit.addFuel(ctx, fuelGoal);
				if(remainder !== 0) {
					remainder = fuelGoal - await transferUnit.addFuel(ctx, remainder);
					if(remainder !== 0) {
						//console.log('surplus fuel lost ', remainder);
					}
				}
			} else if(fuelGoal !== 0) {
				//console.log('fuel transfer failed.');
				return;
			}
		} else if(fuelGoal < 0) {
			//transfering from unit to transferUnit
			fuelGoal = -fuelGoal;
			fuelGoal = Math.min(fuelGoal, unit.storage.fuel, transferUnit.storage.maxFuel - transferUnit.storage.fuel);
			//transfering from transferUnit to unit
			if(fuelGoal !== 0 && await unit.takeFuel(ctx, fuelGoal)) {
				let remainder = fuelGoal - await transferUnit.addFuel(ctx, fuelGoal);
				if(remainder !== 0) {
					remainder = fuelGoal - await unit.addFuel(ctx, remainder);
					if(remainder !== 0) {
						//console.log('surplus fuel lost ', remainder);
					}
				}
			} else if(fuelGoal !== 0) {
				//console.log('fuel transfer failed.');
				return;
			}
		}

		await unit.clearTransferGoal(ctx);
		return;
	}
	if(!unit.movable.destination) {
		return;
	}
	const profile = ctx.logger.startProfile('moving unit');
	const start = await map.getLoc(ctx, unit.location.x, unit.location.y);
	if(!unit.movable) {
		return;
	}
	const dir = DIRECTION.getTypeFromName(unit.movable.path.shift());
	const nextTile = await start.getDirTile(ctx, dir);
	try {
		try {
			await unit.moveToTile(ctx, nextTile);
		} catch (err) {
			throw new WrappedError(err, 'error moving to tile');
		}
		try {
			await unit.setPath(ctx, unit.movable.path);
		} catch (err) {
			throw new WrappedError(err, 'error updating path');
		}
	} catch (err) {
		ctx.logger.trackError(ctx, new WrappedError(err, 'error moving'));
		unit.addPathAttempt(ctx);
		//console.log('move halted');
	} finally {
		ctx.logger.endProfile(profile);
	}

	return;
}