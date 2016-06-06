//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

//TODO
//not tested yet
exports.simulate = (unit,map) => {

		//TODO
		/* //old code
		if (unitInfo && unitInfo.speed && unit.destination && unit.destination.length == 2)
	      dest = new PlanetLoc(planet, unit.destination[0], unit.destination[1])
	      #clear properties if our tile is the destination
	      if (unit.tile.equals(dest))
	        unit.destination = []
	        unit.nextMove = direction.c
	        unit.nextTile = null
	        unit.path = null
	        unit.moving = false
	        unit.totalAttempts = 0

	      else
	        dest = planet.getNearestFreeTile(dest,unit)
	        if (unit.path && !unit.path.end.equals(dest))
	          if (unit.ghostDestination)
	            delete unit.ghostDestination.assignedBuilder
	            delete unit.ghostDestination
	          console.log('pathing for new destination')
	          unit.totalAttempts = 0

	        if (unit.path && unit.path.constructor.name == 'SimplePath' && Nav.distance(unit.tile, dest) < ASTAR_MAX)
	          console.log('switching from simple to A*')
	          unit.path = null;

	        #if we have no destination, set it
	        #or update it if we have a new destination
	        #or re-path if we have waited to move for too long
	        if (!unit.path || !unit.path.end.equals(dest) || unit.moveAttempts > 8)

	          if (Nav.distance(unit.tile, dest) > ASTAR_MAX) #avoid a* over long distances, take dumb approach.
	            unit.path = new Nav.SimplePath(unit.tile,dest)
	            unit.distanceMoved = 0
	            console.log('updating Simple path')
	            update = true
	            unit.moveAttempts = 0
	            #can't find a way after re-pathfing 5 times, give up.
	            if (unit.totalAttempts++ > 5)
	              console.log('giving up on pathing')
	              unit.destination = unit.location

	          else
	            unit.path = new Nav.AStarPath(unit.tile,dest)
	            unit.distanceMoved = 0
	            console.log('updating AStar path')
	            update = true
	            unit.moveAttempts = 0
	            #can't find a way after re-pathfing 5 times, give up.
	            if (unit.totalAttempts++ > 5)
	              console.log('giving up on pathing')
	              unit.destination = unit.location


	        #dont' mess with things if we are stil moving
	        if (!unit.moving && (unit.fireCooldown == undefined || unit.fireCooldown == 0))
	          unit.nextMove = unit.path.getNext(unit.tile)
	          switch(unit.nextMove)
	            #TODO should check if another unit is here
	            when direction.N
	              unit.nextTile = unit.tile.N();
	            when direction.S
	              unit.nextTile = unit.tile.S();
	            when direction.E
	              unit.nextTile = unit.tile.E();
	            when direction.W
	              unit.nextTile = unit.tile.W();
	            else
	              unit.nextTile = unit.tile

	          #check if a unit is blocking the next tile
	          unitOnTile = planet.unitTileCheck(unit.nextTile);
	          if (unitOnTile == null || unitOnTile.ghosting)
	            unit.moving = true;
	            planet.broadcastUpdate({
	              type: "moving"
	              unitId: unit.id
	              newLocation: [unit.nextTile.x,unit.nextTile.y]
	              time: unitInfo.speed / ticksPerSec
	              });
	          else
	            unit.moveAttempts++

	        deltaMove = 1 / unitInfo.speed
	        if (unit.nextMove != direction.C && unit.moving)
	          unit.moving = true
	          unit.distanceMoved += deltaMove
	          if (unit.distanceMoved > 1)
	            unit.distanceMoved = 1

	        if (unit.distanceMoved == 1)
	          unit.moving = false
	          unit.tile = unit.nextTile
	          unit.distanceMoved = 0
	          update = true
	          unit.moveAttempts = 0

		*/
}
