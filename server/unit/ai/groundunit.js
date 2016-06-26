//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');


var TILETYPES = require('../../map/tiletypes.js');
var DIRECTION = require('../../map/directions.js');

//TODO
//not tested yet
async function simulate(unit,map) {

	if (await unit.tickMovement()) {
		//console.log('movement cooldown: ' + unit.movementCooldown);
		return true;
	}

	if (!unit.path || unit.path.length === 0 || !unit.destination) {

		//check if they are trying to transfer resources.
		//if they are, do it.
		if (!unit.transferGoal || !unit.transferGoal.uuid) {
			if (unit.type === 'transport') {
				//wake up nearby ghost builders
				console.log('waking builders');
				let units = await map.getNearbyUnitsFromChunk(unit.chunkHash[0]);
				for (let nearby of units) {
					if (nearby.type === 'builder') {
						nearby.updateUnit({awake: true});
					}
				}
			}

			return false;
		}
		let transferUnit = await db.units[map.name].getUnit(unit.transferGoal.uuid);
		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if (transferUnit.distance(unit) > Math.max(unit.size,transferUnit.size) + 1.05) {
			//if it is not nearby, keep pathing.
			let center = await map.getLoc(transferUnit.x,transferUnit.y);
			let tile = await map.getNearestFreeTile(center,unit,true);
			unit.setDestination(tile.x,tile.y);

			return false;
		}

		//otherwise we are close enough to transfer
		let ironGoal = unit.transferGoal.iron;
		let fuelGoal = unit.transferGoal.fuel;
		console.log('TRANSFERING ',ironGoal,fuelGoal);

		if (ironGoal > 0) {
			ironGoal = Math.min(ironGoal,transferUnit.iron, unit.ironStorage - unit.iron);
			//transfering from transferUnit to unit
			if (ironGoal !== 0 && await transferUnit.takeIron(ironGoal)) {
				console.log('PULLED IRON');
				let remainder = ironGoal - await unit.addIron(ironGoal);
				if (remainder !== 0) {
					console.log('iron remainder ',remainder);
					remainder = ironGoal -  await transferUnit.addIron(remainder);
					if (remainder !== 0) {
						console.log('surplus iron lost ',remainder);
					}
				}
			} else if (ironGoal !== 0){
				console.log('iron transfer failed.');
				return true;
			}
		} else if (ironGoal < 0) {
			//transfering from unit to transferUnit
			ironGoal = -ironGoal;
			ironGoal = Math.min(ironGoal,unit.iron, transferUnit.ironStorage - transferUnit.iron);
			//transfering from transferUnit to unit
			if (ironGoal !== 0 && await unit.takeIron(ironGoal)) {
				console.log('PULLED IRON');
				let remainder = ironGoal - await transferUnit.addIron(ironGoal);
				if (remainder !== 0) {
					console.log('iron remainder ',remainder);
					remainder = ironGoal - await unit.addIron(remainder);
					if (remainder !== 0) {
						console.log('surplus iron lost ',remainder);
					}
				}
			} else if (ironGoal !== 0){
				console.log('iron transfer failed.');
				return true;
			}
		}


		console.log('updating transfer goal');
		unit.setTransferGoal(transferUnit.uuid,0,fuelGoal);

		if (fuelGoal > 0) {
			fuelGoal = Math.min(fuelGoal,transferUnit.fuel, unit.fuelStorage - unit.fuel);
			//transfering from transferUnit to unit
			if (fuelGoal !== 0 && await transferUnit.takeFuel(fuelGoal)) {
				console.log('PULLED FUEL');
				let remainder = fuelGoal - await unit.addFuel(fuelGoal);
				if (remainder !== 0) {
					console.log('fuel remainder ',remainder);
					remainder = fuelGoal -  await transferUnit.addFuel(remainder);
					if (remainder !== 0) {
						console.log('surplus fuel lost ',remainder);
					}
				}
			} else if (fuelGoal !== 0){
				console.log('fuel transfer failed.');
				return true;
			}
		} else if (fuelGoal < 0) {
			//transfering from unit to transferUnit
			fuelGoal = -fuelGoal;
			fuelGoal = Math.min(fuelGoal,unit.fuel, transferUnit.fuelStorage - transferUnit.fuel);
			//transfering from transferUnit to unit
			if (fuelGoal !== 0 && await unit.takeFuel(fuelGoal)) {
				console.log('PULLED FUEL');
				let remainder = fuelGoal - await transferUnit.addFuel(fuelGoal);
				if (remainder !== 0) {
					console.log('fuel remainder ',remainder);
					remainder = fuelGoal - await unit.addFuel(remainder);
					if (remainder !== 0) {
						console.log('surplus fuel lost ',remainder);
					}
				}
			} else if (fuelGoal !== 0){
				console.log('fuel transfer failed.');
				return true;
			}
		}

		await unit.clearTransferGoal();
		return true;
	}

	let start = await map.getLoc(unit.x,unit.y);
	let destinationX = unit.destination.split(":")[0];
	let destinationY = unit.destination.split(":")[1];
	let end = await map.getLoc(destinationX,destinationY);

	let dir = DIRECTION.getTypeFromName(unit.path.shift());
	let nextTile = await start.getDirTile(dir);
	//console.log(start.toString());
	//console.log(nextTile.toString());
	if (await unit.moveToTile(nextTile)) {
		//console.log('updating path');
		await unit.setPath(unit.path);
	} else {
		unit.addPathAttempt();
		//console.log('move halted');
	}

	return true;
}

exports.simulate = simulate;
