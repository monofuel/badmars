/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import {db} from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import Context from 'node-context';

import DIRECTION from '../../map/directions';
import Unit from '../unit';
import Map from '../../map/map';
import PlanetLoc from '../../map/planetloc';

async function actionable(ctx: Context, unit: Unit, map: Map): Promise < boolean > {
	//TODO return if we can move or not
	return false;
}

async function simulate(ctx: Context, unit: Unit, map: Map) {

	if(await unit.tickMovement()) {
		//console.log('movement cooldown: ' + unit.movementCooldown);
		return true;
	}
	if(!unit.movable || !unit.storage) {
		return;
	}

	if(!unit.path || unit.movable.path.length === 0 || !unit.destination) {

		//check if they are trying to transfer resources.
		//if they are, do it.
		if(!unit.transferGoal || !unit.transferGoal.uuid || (unit.transferGoal.iron || 0 === 0 && unit.transferGoal.oil || 0 === 0)) {
			if(unit.details.type === 'transport') {
				//wake up nearby ghost builders
				console.log('waking builders');
				let units: Array < Unit > = await map.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
				for(let nearby: Unit of units) {
					if(nearby.details.type === 'builder') {
						await nearby.update(ctx, { awake: true });
					}
				}
			}

			return false;
		}
		let transferUnit: Unit = await db.units[map.name].getUnit(unit.transferGoal.uuid);
		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if(transferUnit.distance(unit) > Math.max(unit.details.size, transferUnit.details.size) + 1.05) {
			//if it is not nearby, keep pathing.
			console.log('PATHFINDING CLOSER TO TRANSFER UNIT');
			let tiles: Array < PlanetLoc > = await transferUnit.getLocs();
			let tile = await map.getNearestFreeTile(ctx, tiles[0], unit, true);
			unit.setDestination(ctx, tile.x, tile.y);

			return false;
		}

		if(!unit.movable || !unit.storage || !unit.storage.transferGoal || !transferUnit.storage) {
			return;
		}

		//otherwise we are close enough to transfer
		let ironGoal = unit.storage.transferGoal.iron || 0;
		let fuelGoal = unit.storage.transferGoal.fuel || 0;
		console.log('TRANSFERING ', ironGoal, fuelGoal);

		if(!unit.movable || !unit.storage || !unit.storage.transferGoal || !transferUnit.storage) {
			return;
		}
		if(ironGoal > 0) {
			ironGoal = Math.min(ironGoal, transferUnit.storage.iron, unit.storage.maxIron - unit.storage.iron);
			//transfering from transferUnit to unit
			if(ironGoal !== 0 && await transferUnit.takeIron(ironGoal)) {
				console.log('PULLED IRON');
				let remainder = ironGoal - await unit.addIron(ironGoal);
				if(remainder !== 0) {
					console.log('iron remainder ', remainder);
					remainder = ironGoal - await transferUnit.addIron(remainder);
					if(remainder !== 0) {
						console.log('surplus iron lost ', remainder);
					}
				}
			} else if(ironGoal !== 0) {
				console.log('iron transfer failed.');
				return true;
			}
		} else if(ironGoal < 0) {
			//transfering from unit to transferUnit
			ironGoal = -ironGoal;
			ironGoal = Math.min(ironGoal, unit.storage.iron, transferUnit.storage.maxIron - transferUnit.storage.iron);
			//transfering from transferUnit to unit
			if(ironGoal !== 0 && await unit.takeIron(ironGoal)) {
				console.log('PULLED IRON');
				let remainder = ironGoal - await transferUnit.addIron(ironGoal);
				if(remainder !== 0) {
					console.log('iron remainder ', remainder);
					remainder = ironGoal - await unit.addIron(remainder);
					if(remainder !== 0) {
						console.log('surplus iron lost ', remainder);
					}
				}
			} else if(ironGoal !== 0) {
				console.log('iron transfer failed.');
				return true;
			}
		}

		console.log('updating transfer goal');
		unit.setTransferGoal(ctx, transferUnit.uuid, 0, fuelGoal);

		if(!unit.movable || !unit.storage || !unit.storage.transferGoal || !transferUnit.storage) {
			return;
		}

		if(fuelGoal > 0) {
			fuelGoal = Math.min(fuelGoal, transferUnit.storage.fuel, unit.storage.maxFuel - unit.storage.fuel);
			//transfering from transferUnit to unit
			if(fuelGoal !== 0 && await transferUnit.takeFuel(fuelGoal)) {
				console.log('PULLED FUEL');
				let remainder = fuelGoal - await unit.addFuel(fuelGoal);
				if(remainder !== 0) {
					console.log('fuel remainder ', remainder);
					remainder = fuelGoal - await transferUnit.addFuel(remainder);
					if(remainder !== 0) {
						console.log('surplus fuel lost ', remainder);
					}
				}
			} else if(fuelGoal !== 0) {
				console.log('fuel transfer failed.');
				return true;
			}
		} else if(fuelGoal < 0) {
			//transfering from unit to transferUnit
			fuelGoal = -fuelGoal;
			fuelGoal = Math.min(fuelGoal, unit.storage.fuel, transferUnit.storage.maxFuel - transferUnit.storage.fuel);
			//transfering from transferUnit to unit
			if(fuelGoal !== 0 && await unit.takeFuel(fuelGoal)) {
				console.log('PULLED FUEL');
				let remainder = fuelGoal - await transferUnit.addFuel(fuelGoal);
				if(remainder !== 0) {
					console.log('fuel remainder ', remainder);
					remainder = fuelGoal - await unit.addFuel(remainder);
					if(remainder !== 0) {
						console.log('surplus fuel lost ', remainder);
					}
				}
			} else if(fuelGoal !== 0) {
				console.log('fuel transfer failed.');
				return true;
			}
		}

		await unit.clearTransferGoal();
		return true;
	}
	if(!unit.movable.destination) {
		return;
	}
	let destinationHash = unit.movable.destination;
	let start = await map.getLoc(ctx, unit.location.x, unit.location.y);
	let destinationX = parseInt(destinationHash.split(":")[0]);
	let destinationY = parseInt(destinationHash.split(":")[1]);
	let end = await map.getLoc(ctx, destinationX, destinationY);
	if(!unit.movable) {
		return;
	}
	let dir = DIRECTION.getTypeFromName(unit.movable.path.shift());
	let nextTile = await start.getDirTile(dir);
	//console.log(start.toString());
	//console.log(nextTile.toString());
	if(await unit.moveToTile(ctx, nextTile)) {
		//console.log('updating path');
		if(!unit.movable) {
			return;
		}
		await unit.setPath(ctx, unit.movable.path);
	} else {
		unit.addPathAttempt();
		//console.log('move halted');
	}

	return true;
}

export default {
	actionable,
	simulate
}