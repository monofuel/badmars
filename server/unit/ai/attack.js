//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

//TODO not tested  yet
exports.simulate = async (unit,map) => {

	if (unit.fireCooldown) {
		await unit.tickFireCooldown();
		return false;
	}

	if (unit.destination) {
		return false;
	}
	console.log('tank is scanning');
	//get nearest enemy
	//TODO allow attacking a specific enemy
	let enemy = await map.getNearestEnemy(unit);
	if (enemy && enemy.distance(unit) <= unit.range) {
		await unit.armFireCooldown();
		await enemy.takeDamage(unit.firePower);
		if (enemy.health === 0) {
			logger.info('gameEvent',{type:'kill',unitId:enemy.uuid});
		} else {
			logger.info('gameEvent',{type:'attack',enemyId:enemy.uuid,unitId:unit.uuid});
		}
		return true;
	} else if (enemy && enemy.distance(unit) < env.attackMoveRange){
		//TODO move to attack them, then return to position
		return false;
	}
	return false;
}
