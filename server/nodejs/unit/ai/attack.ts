
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../../config/env';
import Context from '../../context';
import db from '../../db';
import logger, { checkContext } from '../../logger';

import Unit from '../unit';
import Map from '../../map/map';

export default class AttackAI {
	enemy: null | Unit;
	async actionable(ctx: Context, unit: Unit, map: Map): Promise<boolean> {
		if (!unit.attack) {
			return false;
		}
		this.enemy = await map.getNearestEnemy(ctx, unit);
		if (!this.enemy) {
			return false;
		}

		return true;
	}

	async simulate(ctx: Context, unit: Unit, map: Map): Promise<void> {
		checkContext(ctx, 'attack simulate');
		//TODO allow force attacking a specific enemy
		const enemy = this.enemy;

		if (!unit.attack || !this.enemy) {
			return;
		}
		// flow complains about unit.attack after awaits
		const range = unit.attack.range;
		const damage = unit.attack.damage;

		if (unit.attack.fireCooldown !== 0) {
			await unit.tickFireCooldown(ctx);
			return;
		}

		if (enemy && enemy.distance(unit) <= range) {
			await unit.armFireCooldown(ctx);
			await enemy.takeDamage(ctx, damage);
			if (enemy.details.health === 0) {
				logger.info(ctx, 'gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
				enemy.delete(ctx);
				logger.info(ctx, 'gameEvent', { type: 'kill', unitId: enemy.uuid });
			} else {
				logger.info(ctx, 'gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
			}
			return;
		} else if (enemy && enemy.distance(unit) < env.attackMoveRange) {
			//TODO move to attack them, then return to position
			return;
		}
		return;
	}
}