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
exports.simulate = (unit,map) => {
	if (unit.ghosting) {
		return false;
	}

	switch (unit.movementType) {
		case 'ground':
			return simulateGround(unit);
		case 'building':
			return simulateBuilding(unit);
		default:
			console.info('unknown constructor', {name: unit.type});
			return false;
	}
}

//TODO
//not tested yet
function simulateBuilding(unit,map) {

	//no units left to build
	if (!unit.factoryQueue || !unit.factoryQueue.length === 0) {
		return false;
	}

	if (unit.factoryQueue[0].cost > 0) {
		if (map.pullIron(unit,unit.factoryQueue[0].cost)) {
			console.log('paying for unit');
			unit.factoryQueue[0].cost = 0;
		}
	}
	if (unit.factoryQueue[0].cost === 0) {
		if (unit.factoryQueue[0].remaining > 0) {
			unit.factoryQueue[0].remaining--;
		} else {
			var newUnitData = unit.factoryQueue.shift();
			var newTile = map.getNearestFreeTile(unit.tile);

			console.log('units left: ', unit.factoryQueue.length);

			var unit = new Unit(newUnitData.type, map, newTile.x, newTile.y);
			map.spawnUnit(unit);
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
function simulateGround(unit,map) {
	//TODO

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
