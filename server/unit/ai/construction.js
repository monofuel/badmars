//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');
var Unit = require('../../unit/unit.js');

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
	console.log(unit.factoryQueue);
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
		}
	}
	if (unit.factoryQueue[0].cost === 0) {
		if (unit.factoryQueue[0].remaining > 0) {
			//unit.factoryQueue[0].remaining--;
			unit.factoryQueue[0].remaining = 0;
			await unit.updateUnit({
				factoryQueue: unit.factoryQueue
				});
		} else {
			let newUnitData = await unit.popFactoryOrder();
			let tile = await map.getLoc(unit.x,unit.y);
			console.log()
			let newTile = await map.getNearestFreeTile(tile,unit);

			console.log('units left: ', unit.factoryQueue.length);
			console.log(Unit);
			let newUnit = new Unit(newUnitType, map, newTile.x, newTile.y);
			newUnit.owner = unit.owner;
			map.spawnUnit(newUnit);
			console.log('factory creating unit');
		}
	}

	/* //old code
	if (unit.type == 'factory' && !unit.ghosting)
      if (!unit.factoryQueue)
        unit.factoryQueue = []
      if (unit.factoryQueue && unit.factoryQueue.length > 0)
        update = true
        if (unit.factoryQueue[0].cost > 0)
          if (planet.pullIron(unit,unit.factoryQueue[0].cost))
            console.log('paying for unit')
            unit.factoryQueue[0].cost = 0
        else
          if (unit.factoryQueue[0].remaining > 0)
            unit.factoryQueue[0].remaining--
          else
            newUnitData = unit.factoryQueue.shift()
            newTile = planet.getNearestFreeTile(unit.tile)
            console.log('units left: ', unit.factoryQueue.length)
            unit.save();
            #should send user the time until the factory completes the next unit

            db.createUnit(newTile,newUnitData.type,unit.owner,true)
              .then((newUnit) ->
                newUnitInfo = exports.get(newUnit.type)
                newUnit.tile = newTile;
                newUnit.totalAttempts = 0
                newUnit.ghosting = false
                newUnit.health = newUnitInfo.maxHealth
                newUnit.iron = 0
                newUnit.oil = 0
                newUnit.save()
                newTile.planet.units.push(newUnit)
                console.log('factory creating unit')
                newTile.planet.broadcastUpdate({type: 'updateUnits',units: [newUnit], success: true});
              ).catch((error) ->
                console.log(error)
                )

	*/

	return true;
}


//TODO
//not tested yet
async function simulateGround(unit,map) {
	console.log('simulating constructor');
	let nearestGhost = null;
	let units = await map.getNearbyUnitsFromChunk(unit.chunkHash[0],2);
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
		return;
	}

	if (await map.pullIron(unit,nearestGhost.cost)) {
		console.log('paying for building');
		//TODO builder should halt and spend time building
		//should also make sure the area is clear
		console.log(nearestGhost);
		let result = await nearestGhost.updateUnit({ghosting: false});
		console.log(result);
	}

	/* //old code
	if (unit.type == 'builder')
	  nearestGhost = null;
	  if (!unit.ghostDestination)
		ghosts = planet.findNearestGhosts(unit);
		for ghost in ghosts
		  if (!ghost.assignedBuilder)
			nearestGhost = ghost
			break
	  else
		nearestGhost = unit.ghostDestination

	  nearestFreeTile = null
	  if (nearestGhost)
		nearestFreeTile = planet.getNearestFreeTile(nearestGhost.tile,unit,true)
	  if (nearestGhost && unit.tile.equals(nearestFreeTile)) #construct if nearby
		ghostInfo = exports.get(nearestGhost.type)
		if (planet.checkValidForUnit(nearestGhost.tile,nearestGhost.type) && planet.pullIron(unit,ghostInfo.cost))
		  nearestGhost.ghosting = false
		  ghostInfo = exports.get(nearestGhost.type);
		  nearestGhost.health = ghostInfo.maxHealth;
		  unit.update = true
		  delete unit.ghostDestination
		  nearestGhost.save()
		  planet.broadcastUpdate({
			type: "updateUnits"
			units: [nearestGhost]
			success: true
			});
		  #TODO make the builder stop moving and take time to build

	  #head to nearest ghost
	  if ((!unit.destination || unit.destination.length == 0) && !unit.tile.equals(nearestFreeTile))
		if (nearestGhost && nearestGhost.tile.distance(unit.tile) < 30)
		  console.log('builder found ghost, heading to it')
		  unit.destination = [nearestFreeTile.x,nearestFreeTile.y]
		  nearestGhost.assignedBuilder = unit #TODO hacky, could be better
		  unit.ghostDestination = nearestGhost
	*/
}
