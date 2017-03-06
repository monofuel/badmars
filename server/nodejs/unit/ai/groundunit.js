/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import { checkContext } from '../../util/logger';

import PlanetLoc from '../../map/planetloc';
import DIRECTION from '../../map/directions';
import type Unit from '../unit';
import type Map from '../../map/map';


export async function actionable(ctx: MonoContext, unit: Unit): Promise<boolean> {
	if (!unit.movable || !unit.storage) {
		return false;
	}

	if (!unit.movable.path && !unit.movable.transferGoal) {
		return false;
	}
	return true;
}

export async function simulate(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
	checkContext(ctx, 'groundUnit simulate');

	if(await unit.tickMovement(ctx)) {
		//console.log('movement cooldown: ' + unit.movementCooldown);
		return;
	}
	if(!unit.movable || !unit.storage) {
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
	//const destinationHash = unit.movable.destination;
	const start = await map.getLoc(ctx, unit.location.x, unit.location.y);
	//const destinationX = parseInt(destinationHash.split(':')[0]);
	//const destinationY = parseInt(destinationHash.split(':')[1]);
	// const end = await map.getLoc(ctx, destinationX, destinationY);
	if(!unit.movable) {
		return;
	}
	const dir = DIRECTION.getTypeFromName(unit.movable.path.shift());
	const nextTile = await start.getDirTile(ctx, dir);
	//console.log(start.toString());
	//console.log(nextTile.toString());
	if(await unit.moveToTile(ctx, nextTile)) {
		//console.log('updating path');
		if(!unit.movable) {
			return;
		}
		await unit.setPath(ctx, unit.movable.path);
	} else {
		unit.addPathAttempt(ctx);
		//console.log('move halted');
	}

	return;
}