//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

//TODO not tested  yet
exports.simulate = (unit,map) => {

	return false;
	//TODO

	/* // old code
	#cooldown after firing
	#TODO unitInfo is checked as some units dont' have unit info (maybe should so something about that)
	if (unitInfo && unitInfo.firePower) #unitInfo.firePower is a little bit hacky of a way to see if a unit can shoot
	  if (!unit.fireCooldown)
		unit.fireCooldown = 0
	  else if (unit.fireCooldown > 0)
		update = true
		unit.fireCooldown--
	  else if (unit.fireCooldown < 0)
		update = true
		unit.fireCooldown = 0

	if (unitInfo && unitInfo.firePower && unit.fireCooldown == 0 && !unit.moving)
	  #check for an enemy to shoot
	  enemy = planet.getNearestEnemy(unit)
	  if (enemy && enemy.tile.distance(unit.tile) < unitInfo.range)
		update = true;
		#SHOOT THEM
		unit.fireCooldown = unitInfo.fireRate
		enemy.health -= unitInfo.firePower
		Logger.serverInfo("auto_attack",{
		  unit: unit
		  enemy: enemy
		  distance: enemy.tile.distance(unit.tile)
		  })
		if (enemy.health <= 0)
		  planet.broadcastUpdate({
			type: "kill"
			unitId: unit.id
			enemyId: enemy.id
			});
		  planet.killUnit(enemy)
		else
		  planet.broadcastUpdate({
			type: "attack"
			unitId: unit.id
			enemyId: enemy.id
			enemyHealth: enemy.health
			});
		  #TODO we are saving a unit other than the one currently being simulated. this is odd.
		  enemy.save()

	*/
}
