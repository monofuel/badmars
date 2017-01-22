/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import {db} from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import Context from 'node-context';

import Unit from '../unit';
import Map from '../../map/map';

async function actionable(ctx: Context, unit: Unit, map: Map): Promise<boolean> {
	//TODO return if we can attack or not
	return false;
}

async function simulate(ctx: Context, unit: Unit, map: Map) {

	//TODO allow force attacking a specific enemy
	const enemy = await map.getNearestEnemy(ctx, unit);

	if(!enemy) {
		return;
	}

	if(!unit.attack) {
		return; // shouldn't happen after actionable() check
	}
	// flow complains about unit.attack after awaits
	const range = unit.attack.range;
	const damage = unit.attack.damage;

	if(unit.attack.fireCooldown !== 0) {
		await unit.tickFireCooldown();
		return;
	}

	if(enemy && enemy.distance(unit) <= range) {
		await unit.armFireCooldown();
		await enemy.takeDamage(damage);
		if(enemy.health === 0) {
			logger.info('gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
			console.log('enemy killed, deleting');
			enemy.delete();
			logger.info('gameEvent', { type: 'kill', unitId: enemy.uuid });
		} else {
			logger.info('gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
		}
		return true;
	} else if(enemy && enemy.distance(unit) < env.attackMoveRange) {
		console.log('enemy nearby, but not in range');
		//TODO move to attack them, then return to position
		return false;
	}
	console.log('no enemies nearby');
	return false;
}

export default {
	actionable,
	simulate
};
