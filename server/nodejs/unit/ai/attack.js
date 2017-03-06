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

export default class AttackAI {
	enemy: ?Unit;
	async actionable(ctx: MonoContext, unit: Unit, map: Map): Promise<boolean> {
		if (!unit.attack) {
			return false;
		}
		this.enemy = await map.getNearestEnemy(ctx, unit);
		if (!this.enemy) {
			return false;
		}
		
		return true;
	}

	async simulate(ctx: MonoContext, unit: Unit): Promise<void> {
		checkContext(ctx, 'attack simulate');
		//TODO allow force attacking a specific enemy
		const enemy = this.enemy;

		if(!unit.attack || !this.enemy) {
			return;
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
}