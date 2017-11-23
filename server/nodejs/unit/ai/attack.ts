
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../../config/env';
import Context from '../../context';
import logger from '../../logger';
import { getNearestEnemy, unitDistance, tickFireCooldown, armFireCooldown, takeDamage, destroy } from '../unit';
import UnitAI from './';

export default class AttackAI implements UnitAI {
	enemy: null | Unit;
	async actionable(ctx: Context, unit: Unit): Promise<boolean> {
		if (!unit.attack) {
			return false;
		}
		this.enemy = await getNearestEnemy(ctx, unit);
		if (!this.enemy) {
			return false;
		}

		return true;
	}

	async simulate(ctx: Context, unit: Unit): Promise<void> {
		ctx.check('attack simulate');
		//TODO allow force attacking a specific enemy
		const enemy = this.enemy;

		if (!unit.attack || !this.enemy) {
			return;
		}
		// flow complains about unit.attack after awaits
		const range = unit.attack.range;
		const damage = unit.attack.damage;

		if (unit.attack.fireCooldown !== 0) {
			await tickFireCooldown(ctx, unit);
			return;
		}

		if (enemy && unitDistance(unit, enemy) <= range) {
			await armFireCooldown(ctx, unit);
			await takeDamage(ctx, enemy, damage);
			if (enemy.details.health === 0) {
				logger.info(ctx, 'gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
				destroy(ctx, enemy);
				logger.info(ctx, 'gameEvent', { type: 'kill', unitId: enemy.uuid });
			} else {
				logger.info(ctx, 'gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
			}
			return;
		} else if (enemy && unitDistance(unit, enemy) < env.attackMoveRange) {
			//TODO move to attack them, then return to position
			return;
		}
		return;
	}
}