//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');


//pass in the unit to update
//returns true if the unit was updated
async function simulate(unit,map){
	if (unit.ghosting || !unit.construction) {
		return false;
	}

	switch (unit.movementType) {
		case 'ground':
			return simulateGround(unit,map);
		case 'building':
			return simulateBuilding(unit,map);
		default:
			console.info('unknown constructor', {name: unit.type});
			return false;
	}
}

exports.simulate = simulate;

//TODO
//not tested yet
async function simulateBuilding(unit,map) {

	//no units left to build
	if (!unit.factoryQueue || unit.factoryQueue.length === 0) {
		return false;
	}
	console.log('simulating factory');
	let newUnitType = unit.factoryQueue[0].type;
	let unitInfo = unit.getTypeInfo(newUnitType);
	console.log('building: ' + newUnitType);

	if (unit.factoryQueue[0].cost > 0) {
		if (await map.pullIron(unit,unit.factoryQueue[0].cost)) {
			console.log('paying for unit');
			unit.factoryQueue[0].cost = 0;

			await unit.updateUnit({
				factoryQueue: unit.factoryQueue
				});
		} else {
			console.log('not enough resources');
		}
	}
	if (unit.factoryQueue[0].cost === 0) {
		if (unit.factoryQueue[0].remaining > 0) {
			unit.factoryQueue[0].remaining--;
			await unit.updateUnit({
				factoryQueue: unit.factoryQueue
				});
		} else {
			let newUnitData = await unit.popFactoryOrder();
			console.log(newUnitData);
			let tile = await map.getLoc(unit.x,unit.y);
			let newTile = await map.getNearestFreeTile(tile);

			//if spawn fails, should re-try with a new location
			let result = await map.factoryMakeUnit(newUnitType,unit.owner,newTile.x,newTile.y);
			if (result) {
				console.log('factory created ',newUnitType);
			} else {
				console.log('factory failed to create ',newUnitType);
			}
		}
	}

	return true;
}


//TODO
//not tested yet
async function simulateGround(unit,map) {
	console.log('simulating constructor');
	let nearestGhost = null;
	let units = await map.getNearbyUnitsFromChunk(unit.chunkHash[0]);
	map.sortByNearestUnit(units,unit);

	for (let nearbyUnit of units) {
		if (!nearbyUnit.ghosting) {
			continue;
		}

		//1.01 is 1 for the unit, + 0.01 for float fudge factor (ffffffffffff)
		if (nearbyUnit.distance(unit) < nearbyUnit.size + 1.05) {
			nearestGhost = nearbyUnit;
			break;
		}
	}

	if (!nearestGhost) {
		//if there is no ghost next to this unit, find one.
		for (let nearbyUnit of units) {
			if (!nearbyUnit.ghosting) {
				continue;
			}
			if (nearbyUnit.owner !== unit.owner) {
				continue;
			}

			let center = await map.getLoc(nearbyUnit.x,nearbyUnit.y);
			let tile = await map.getNearestFreeTile(center,unit,true);

			//check if there are resources within range
			let iron_available = 0;
			for (let nearbyUnit2 of units) {
				let distance = nearbyUnit2.distance(center);
				if (distance > unit.transferRange && distance > nearbyUnit2.transferRange) {
					continue;
				}
				iron_available += nearbyUnit2.iron;
			}
			if (iron_available > nearbyUnit.cost) {
				console.log('iron available',iron_available);
				console.log('unit cost',nearbyUnit.cost);
				unit.setDestination(tile.x,tile.y);
				console.log('builder pathing to ghost');
				return true;
			} else {
				console.log('not enough resources near ghost');
			}
		}

		return false;
	}

	if (await map.pullIron(unit,nearestGhost.cost)) {
		console.log('paying for building');
		//TODO builder should halt and spend time building
		//should also make sure the area is clear
		let result = await nearestGhost.updateUnit({ghosting: false, awake: true});
		return true;
	}
}
