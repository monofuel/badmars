
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
import Context from '../../context';
import db from '../../db';
import logger, { checkContext, WrappedError, DetailedError } from '../../logger';

import PlanetLoc from '../../map/planetloc';
import DIRECTION from '../../map/directions';
import Unit from '../unit';
import Map from '../../map/map';

import { sendResource } from '../procedures';
import { areUnitsAdjacent, getNearestAdjacentTile } from '../../map/tiles';


export async function actionable(ctx: Context, unit: Unit, map: Map): Promise<boolean> {
	if (!unit.movable) {
		return false;
	}

	// TODO should refactor transferGoal to be a regular goal/destination
	if (unit.movable.transferGoal && unit.movable.transferGoal.uuid) {
		return true;
	}

	if (!unit.movable.path) {
		return false;
	}
	if (!unit.movable.destination) {
		return false;
	}
	return true;
}

export async function simulate(ctx: Context, unit: Unit, map: Map): Promise<void> {
	checkContext(ctx, 'groundUnit simulate');
	const planetDB = await db.getPlanetDB(ctx, this.location.map);

	// flow sucks
	const movable = unit.movable;
	if (!movable) {
		// should never reach this
		return;
	}

	if (await unit.tickMovement(ctx)) {
		// waiting until we can move again
		return;
	}

	if (movable.transferGoal && !movable.destination) {
		const transferUnit = await planetDB.unit.get(ctx, movable.transferGoal.uuid);
		if (await areUnitsAdjacent(ctx, unit, transferUnit)) {
			logger.info(ctx, 'performing transfer', { uuid: unit.uuid });
			await performTransfer(ctx, unit, transferUnit);
		} else {
			const newDest = await getNearestAdjacentTile(ctx, unit, transferUnit);
			logger.info(ctx, 'updating destination to transfer unit', { uuid: unit.uuid });
			await unit.setDestination(ctx, newDest.x, newDest.y);
		}
		return;
	}

	if (movable.destination && movable.path.length === 0) {
		logger.info(ctx, 'unit waiting for path', { uuid: unit.uuid });
		return;
	}

	if (movable.path) {
		await advancePath(ctx, unit, map);
	}
}

async function performTransfer(ctx: Context, src: Unit, dest: Unit): Promise<void> {
	if (src.movable && src.movable.transferGoal && src.movable.transferGoal.iron) {
		await sendResource(ctx, 'iron', src.movable.transferGoal.iron, src, dest);
	}

	if (src.movable && src.movable.transferGoal && src.movable.transferGoal.fuel) {
		await sendResource(ctx, 'fuel', src.movable.transferGoal.fuel, src, dest);
	}

	await src.update(ctx, { movable: { transferGoal: null }});

}
async function advancePath(ctx: Context, unit: Unit, map: Map): Promise<void> {
	if(!unit.movable) {
		return;
	}
	const path = unit.movable.path;

	const profile = logger.startProfile('moving unit');

	const start = await map.getLoc(ctx, unit.location.x, unit.location.y);
	const dir = DIRECTION.getTypeFromName(path.shift());
	const nextTile = await start.getDirTile(ctx, dir);
	try {
		try {
			await unit.moveToTile(ctx, nextTile);
		} catch (err) {
			throw new WrappedError(err, 'error moving to tile');
		}
		try {
			await unit.update(ctx, { path });
		} catch (err) {
			throw new WrappedError(err, 'error updating path');
		}
	} catch (err) {
		logger.trackError(ctx, new WrappedError(err, 'error moving'));
		unit.addPathAttempt(ctx);
		//console.log('move halted');
	} finally {
		logger.endProfile(profile);
	}
}