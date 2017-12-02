import * as _ from 'lodash';
import Context from '../../context';
import db from '../../db';
import logger, { WrappedError, DetailedError } from '../../logger';

import PlanetLoc from '../../map/planetloc';
import DIRECTION from '../../map/directions';
import Map from '../../map/map';

import { sendResource, tickMovement, setUnitDestination, clearTransferGoal, moveUnit, addPathAttempt, setPath } from '../unit';
import { areUnitsAdjacent, getNearestAdjacentTile } from '../../map/tiles';


export async function actionable(ctx: Context, unit: Unit): Promise<boolean> {
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

export async function simulate(ctx: Context, unit: Unit): Promise<void> {
	ctx.check('groundUnit simulate');
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);

	// logger.info(ctx, 'found movable unit');

	// waiting to move again
	if (unit.movable.movementCooldown > 0) {
		await tickMovement(ctx, unit);
		return;
	}

	// if we have a transfer goal, path to the destination
	if (unit.movable.transferGoal && !unit.movable.destination) {
		const transferUnit = await planetDB.unit.get(ctx, unit.movable.transferGoal.uuid);
		if (await areUnitsAdjacent(ctx, transferUnit, unit)) {
			logger.info(ctx, 'performing transfer', { uuid: unit.uuid });
			await performTransfer(ctx, unit, transferUnit);
		} else {
			const newDest = await getNearestAdjacentTile(ctx, unit, transferUnit);
			logger.info(ctx, 'updating destination to transfer unit', { uuid: unit.uuid });
			await setUnitDestination(ctx, unit, newDest.x, newDest.y);
		}
		return;
	}


	// check if we are waiting for a path
	if (unit.movable.destination && unit.movable.path.length === 0) {
		logger.info(ctx, 'unit waiting for path', { uuid: unit.uuid });
		return;
	}
	if (unit.movable.path) {
		await advancePath(ctx, unit, planetDB.planet);
	}
}
async function performTransfer(ctx: Context, src: Unit, dest: Unit): Promise<void> {
	if (src.movable && src.movable.transferGoal && src.movable.transferGoal.iron) {
		await sendResource(ctx, 'iron', src.movable.transferGoal.iron, dest, src);
	}

	if (src.movable && src.movable.transferGoal && src.movable.transferGoal.fuel) {
		await sendResource(ctx, 'fuel', src.movable.transferGoal.fuel, dest, src);
	}

	await clearTransferGoal(ctx, src);
}

async function advancePath(ctx: Context, unit: Unit, map: Map): Promise<void> {
	if (!unit.movable) {
		return;
	}
	const path = [...unit.movable.path];

	const profile = logger.startProfile('moving unit');

	const start = await map.getLoc(ctx, unit.location.x, unit.location.y);
	const dir = DIRECTION.getTypeFromName(path.shift());
	const nextTile = await start.getDirTile(ctx, dir);
	try {
		try {
			await moveUnit(ctx, unit, nextTile);
		} catch (err) {
			throw new WrappedError(err, 'error moving to tile');
		}
		try {
			await setPath(ctx, unit, path);
		} catch (err) {
			throw new WrappedError(err, 'error updating path');
		}
	} catch (err) {
		logger.trackError(ctx, new WrappedError(err, 'error moving'));
		addPathAttempt(ctx, unit);
		//console.log('move halted');
	} finally {
		logger.endProfile(profile);
	}


}