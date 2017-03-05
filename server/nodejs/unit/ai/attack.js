/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../../config/env';
import MonoContext from '../../util/monoContext';
import { checkContext } from '../../util/logger';

import type Unit from '../unit';
import type Map from '../../map/map';

export async function actionable(): Promise<boolean> {
	//TODO return if we can attack or not
	return false;
}

export async function simulate(ctx: MonoContext, unit: Unit, map: Map): Promise<void> {
	checkContext(ctx, 'attack simulate');
	//TODO allow force attacking a specific enemy
	const enemy: Unit = await map.getNearestEnemy(ctx, unit);

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
		await unit.tickFireCooldown(ctx);
		return;
	}

	if(enemy && enemy.distance(unit) <= range) {
		await unit.armFireCooldown(ctx);
		await enemy.takeDamage(ctx, damage);
		if(enemy.health === 0) {
			ctx.logger.info(ctx, 'gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
			enemy.delete(ctx);
			ctx.logger.info(ctx, 'gameEvent', { type: 'kill', unitId: enemy.uuid });
		} else {
			ctx.logger.info(ctx, 'gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
		}
		return;
	} else if(enemy && enemy.distance(unit) < env.attackMoveRange) {
		//TODO move to attack them, then return to position
		return;
	}
	return;
}
