
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../context';
import db from '../db';
import logger, { DetailedError, WrappedError } from '../logger';
import env from '../config/env';
import * as groundUnitAI from './ai/groundunit';
import AttackAI from './ai/attack';
import ConstructionAI from './ai/construction';
import * as mineAI from './ai/mine';
import PlanetLoc, { getLocationDetails } from '../map/planetloc';
import * as uuidv4 from 'uuid/v4';
import Chunk from '../map/chunk';

import {
	UnitDetails,
	UnitLocation,
	UnitMovable,
	UnitAttack,
	UnitStorage,
	UnitGraphical,
	UnitStationary,
	UnitConstruct
} from './components';

export default interface Unit {
	uuid: UUID;
	awake: boolean;
	details: UnitDetails;
	location: UnitLocation;
	movable: null | UnitMovable;
	attack: null | UnitAttack;
	storage: null | UnitStorage;
	graphical: null | UnitGraphical;
	stationary: null | UnitStationary;
	construct: null | UnitConstruct;
}

export interface UnitPatch {
	uuid: UUID;
	awake: boolean;
	details: Partial<UnitDetails>;
	location: Partial<UnitLocation>;
	movable: null | Partial<UnitMovable>;
	attack: null | Partial<UnitAttack>;
	storage: null | Partial<UnitStorage>;
	graphical: null | Partial<UnitGraphical>;
	stationary: null | Partial<UnitStationary>;
	construct: null | Partial<UnitConstruct>;
}

async function patchUnit(ctx: Context, unit: Unit, patch: Partial<UnitPatch>): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	const newUnit = await planetDB.unit.patch(ctx, unit.uuid, patch);
	Object.assign(unit, newUnit);
}

// for creating new units
export async function newUnit(ctx: Context, type: string, loc: PlanetLoc): Promise<Unit> {
	ctx.check('newUnit');
	const planetDB = await db.getPlanetDB(ctx, loc.map.name);
	const unitStats = await planetDB.unitStat.get(ctx, type);
	const optional: Partial<Unit> = {};

	if (unitStats.attack) {
		optional.attack = {
			...unitStats.attack,
			fireCooldown: 0,
		}
	}

	if (unitStats.storage) {
		optional.storage = {
			...unitStats.storage,
			resourceCooldown: 0,
			iron: 0,
			fuel: 0
		}
	}

	if (unitStats.movable) {
		optional.movable = {
			...unitStats.movable,
			movementCooldown: 0,
			path: [],
			pathAttempts: 0,
			pathAttemptAttempts: 0,
			isPathing: false,
			pathUpdate: 0,
			transferGoal: null,
		}
	}


	const { x, y } = loc;

	let hash;
	if (unitStats.details.size === 1) {
		hash = [x + ':' + y];
	} else if (unitStats.details.size === 2) {
		hash = [
			(x) + ':' + (y), (x + 1) + ':' + (y),
			(x) + ':' + (y + 1), (x + 1) + ':' + (y + 1)
		];
	} else if (unitStats.details.size === 3) {
		hash = [
			(x - 1) + ':' + (y - 1), (x) + ':' + (y - 1), (x + 1) + ':' + (y - 1),
			(x - 1) + ':' + (y), (x) + ':' + (y), (x + 1) + ':' + (y),
			(x - 1) + ':' + (y + 1), (x) + ':' + (y + 1), (x + 1) + ':' + (y + 1)
		];
	} else {
		throw new DetailedError('invalid unit size', { type, size: unitStats.details.size });
	}

	const chunkHash = new Set()

	hash.forEach((tileHash: string) => {
		const x = parseInt(tileHash.split(':')[0]);
		const y = parseInt(tileHash.split(':')[1]);
		const locDetails = getLocationDetails(x, y, loc.map.settings.chunkSize);
		chunkHash.add(`${locDetails.chunkX}:${locDetails.chunkY}`)
	})

	const location = {
		map: loc.map.name,
		x,
		y,
		hash,
		chunkX: loc.chunk.x,
		chunkY: loc.chunk.y,
		chunkHash: Array.from(chunkHash),
	}

	return {
		...unitStats,
		uuid: uuidv4(),
		awake: true,
		details: {
			...unitStats.details,
			type,
			ghosting: false,
			owner: '',
			health: unitStats.details.maxHealth,
			lastTick: 0,
		},
		location,
		...optional
	}
}

export async function simulate(ctx: Context, unit: Unit): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	ctx.check('simulate');

	const actionPromises = [];
	const actionable = {
		mineAI: false,
		groundUnitAI: false,
		constructionAI: false,
		attackAI: false
	};

	// TODO handle when unitStat changes

	// ------------------
	// iron and oil should always be off
	if (unit.details.type === 'oil' || unit.details.type === 'iron') {
		await patchUnit(ctx, unit, { awake: false });
		return
	}

	// ghosting units don't need to be awake
	if (unit.details.ghosting) {
		await patchUnit(ctx, unit, { awake: false });
		return
	}

	// ------------------
	// execute actionable promises
	// see what actions are possible
	const profile = logger.startProfile('unit_AI');

	const attackAI = new AttackAI();
	const constructionAI = new ConstructionAI();

	if (unit.details.type === 'mine') {
		actionPromises.push(mineAI.actionable(ctx, unit)
			.then((result: boolean) => {
				actionable.mineAI = result;
			}).catch((err: Error) => {
				throw new WrappedError(err, 'mine actionable');
			}));
	}
	if (unit.movable) {
		switch (unit.movable.layer) {
			case 'ground':
				actionPromises.push(groundUnitAI.actionable(ctx, unit)
					.then((result: boolean) => {
						actionable.groundUnitAI = result;
					}).catch((err: Error) => {
						throw new WrappedError(err, 'groundUnitAI actionable');
					}));
		}
	}

	if (unit.attack) {
		actionPromises.push(attackAI.actionable(ctx, unit)
			.then((result: boolean) => {
				actionable.attackAI = result;
			}).catch((err: Error) => {
				throw new WrappedError(err, 'attackAI actionable');
			}));
	}

	if (unit.construct) {
		actionPromises.push(constructionAI.actionable(ctx, unit)
			.then((result: boolean) => {
				actionable.constructionAI = result;
			}).catch((err: Error) => {
				throw new WrappedError(err, 'constructionAI actionable');
			}));
	}
	ctx.check('pre actionable');
	try {
		await Promise.all(actionPromises);
	} catch (err) {
		throw new WrappedError(err, 'failed checking actionables');
	}

	ctx.check('pre action');
	//------------------
	// actionable map is filled out
	// pick an action to perform
	try {
		if (actionable.mineAI) {
			logger.info(ctx, 'processing mine', {}, { silent: true });
			await mineAI.simulate(ctx, unit);
		} else if (actionable.attackAI) {
			logger.info(ctx, 'processing attack');
			await attackAI.simulate(ctx, unit);
		} else if (actionable.groundUnitAI) {
			logger.info(ctx, 'processing ground AI', {}, { silent: true });
			await groundUnitAI.simulate(ctx, unit);
		} else if (actionable.constructionAI) {
			logger.info(ctx, 'processing construction');
			await constructionAI.simulate(ctx, unit);
		} else { // if no action is performed
			logger.info(ctx, 'sleeping unit');
			await planetDB.unit.patch(ctx, unit.uuid, { awake: false });
		}
	} catch (err) {
		throw new WrappedError(err, 'failed to perform action', actionable);
	}
	ctx.check('post action');
	logger.endProfile(profile);
}

export async function addFactoryOrder(ctx: Context, unit: Unit, unitType: UnitType): Promise<void> {
	ctx.check('addFactoryOrder');
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);

	if (!unit.construct) {
		throw new DetailedError('unit cannot construct', { uuid: unit.uuid, type: unit.details.type });
	}

	const stats = await planetDB.unitStat.get(ctx, unitType);
	if (!stats) {
		throw new DetailedError('cannot add invalid factory order', { uuid: unit.uuid, type: unitType });
	}

	const order: FactoryOrder = {
		uuid: uuidv4(),
		type: unitType,
		factory: unit.uuid,
		created: Date.now(),
	};

	planetDB.factoryQueue.create(ctx, order);
}

export async function popFactoryOrder(ctx: Context, unit: Unit): Promise<any> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	if (!unit.construct) {
		throw new DetailedError('unit cannot construct', { uuid: unit.uuid, type: unit.details.type });
	}
	return await planetDB.factoryQueue.pop(ctx, unit.uuid);
}

export async function addPathAttempt(ctx: Context, unit: Unit): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	unit.movable.pathAttempts++;

	if (unit.movable.pathAttempts > env.movementAttemptLimit) {
		const movable = { pathAttempts: unit.movable.pathAttempts };
		await patchUnit(ctx, unit, { movable });
	} else if (unit.movable.pathAttemptAttempts > 2) {
		//totally give up on pathing
		await clearDestination(ctx, unit);
	} else {
		//blank out the path but leave the destination so that we will re-path
		const movable: Partial<UnitMovable> = {
			pathAttempts: 0,
			isPathing: false,
			path: [],
			pathAttemptAttempts: unit.movable.pathAttemptAttempts++
		};
		patchUnit(ctx, unit, { movable });
	}

}
export async function setTransferGoal(ctx: Context, unit: Unit, uuid: UUID, iron: number, fuel: number): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const movable = {
		transferGoal: {
			uuid: uuid,
			iron: iron,
			fuel: fuel
		}
	};
	return patchUnit(ctx, unit, { movable });
}

export async function clearTransferGoal(ctx: Context, unit: Unit): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const movable: Partial<UnitMovable> = {
		transferGoal: null
	};
	return patchUnit(ctx, unit, { movable });
}

export async function setUnitDestination(ctx: Context, unit: Unit, x: number, y: number): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const hash = x + ':' + y;
	const movable: Partial<UnitMovable> = { destination: hash, isPathing: false, path: [] };
	return await patchUnit(ctx, unit, { movable });
}

export async function setPath(ctx: Context, unit: Unit, path: Array<any>): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const movable = { path: path, isPathing: false };
	return await patchUnit(ctx, unit, { movable });
}

export async function clearDestination(ctx: Context, unit: Unit): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const movable: Partial<UnitMovable> = {
		destination: null,
		isPathing: false,
		path: [],
		pathAttemptAttempts: 0
	};
	return patchUnit(ctx, unit, { movable });
}

export async function clearPath(ctx: Context, unit: Unit): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const movable: Partial<UnitMovable> = {
		isPathing: false,
		path: [],
		pathAttemptAttempts: 0
	};
	await planetDB.unit.patch(ctx, unit.uuid, { movable });
}

export async function tickMovement(ctx: Context, unit: Unit): Promise<void> {
	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	const movable = {
		movementCooldown: unit.movable.movementCooldown--
	};
	return patchUnit(ctx, unit, { movable });
}

export async function tickFireCooldown(ctx: Context, unit: Unit): Promise<void> {
	if (!unit.attack) {
		throw new DetailedError('unit can\'t attack', { uuid: unit.uuid, type: unit.details.type });
	}
	const attack = {
		fireCooldown: unit.attack.fireCooldown--
	};
	await patchUnit(ctx, unit, { attack });
}

export async function armFireCooldown(ctx: Context, unit: Unit): Promise<void> {
	if (!unit.attack) {
		throw new DetailedError('unit can\'t attack', { uuid: unit.uuid, type: unit.details.type });
	}
	const attack = {
		fireCooldown: unit.attack.fireRate
	};
	await patchUnit(ctx, unit, { attack });
}

export async function takeDamage(ctx: Context, unit: Unit, dmg: number): Promise<void> {
	if (unit.details.maxHealth === 0) {
		throw new DetailedError('non-attackable unit attacked', { uuid: unit.uuid, type: unit.details.type });
	}
	const details = {
		health: unit.details.health - dmg
	};
	if (details.health < 0) {
		details.health = 0;
	}
	await patchUnit(ctx, unit, { details, awake: true });
}

export async function tickResourceCooldown(ctx: Context, unit: Unit): Promise<void> {
	let resourceCooldown = unit.storage.resourceCooldown - 1;
	if (resourceCooldown < 0) {
		resourceCooldown = ctx.env.resourceTicks;
	}
	const storage: Partial<UnitStorage> = {
		resourceCooldown,
	}
	await patchUnit(ctx, unit, { storage });
}

export async function destroy(ctx: Context, unit: Unit): Promise<void> {
	// TODO should probaly only destroy units at the end of a turn
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	planetDB.unit.delete(ctx, unit.uuid);
}

export function unitDistance(src: Unit, dst: Unit): number {
	const deltaX = Math.abs(src.location.x - dst.location.x);
	const deltaY = Math.abs(src.location.y - dst.location.y);
	return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
}

export async function getUnitLocs(ctx: Context, unit: Unit): Promise<Array<PlanetLoc>> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	ctx.check('getLocs');
	const promises: Array<Promise<PlanetLoc>> = [];
	unit.location.hash.forEach((hash: TileHash) => {
		const x = Number(hash.split(':')[0]);
		const y = Number(hash.split(':')[1]);
		promises.push(planetDB.planet.getLoc(ctx, x, y));
	});
	return Promise.all(promises);
}

export async function getChunks(ctx: Context, unit: Unit): Promise<Array<Chunk>> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	ctx.check('getChunks');
	const promises: Array<Promise<Chunk>> = [];
	unit.location.chunkHash.forEach((hash: TileHash) => {
		const x = Number(hash.split(':')[0]);
		const y = Number(hash.split(':')[1]);
		promises.push(planetDB.planet.getChunk(ctx, x, y));
	});
	return Promise.all(promises);
}


export async function addToChunks(ctx: Context, unit: Unit): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	const locs = await getUnitLocs(ctx, unit);
	for (const loc of locs) {
		if (unit.details.type === 'iron' || unit.details.type === 'oil') {
			await planetDB.chunkLayer.setEntity(ctx, loc.hash, 'resource', unit.uuid, loc.hash);
		} else {
			await planetDB.chunkLayer.setEntity(ctx, loc.hash, 'ground', unit.uuid, loc.hash);
		}
	}
}

export async function clearFromChunks(ctx: Context, unit: Unit): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	ctx.check('clearFromChunks');
	const locs = await getUnitLocs(ctx, unit);
	for (const loc of locs) {
		if (unit.details.type === 'iron' || unit.details.type === 'oil') {
			await planetDB.chunkLayer.clearEntity(ctx, loc.hash, 'resource', unit.uuid, loc.hash);
		} else {
			await planetDB.chunkLayer.clearEntity(ctx, loc.hash, 'ground', unit.uuid, loc.hash);
		}
	}
}


export async function moveUnit(ctx: Context, unit: Unit, tile: PlanetLoc): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	ctx.check('moveUnit');

	if (!unit.movable) {
		throw new DetailedError('unit is not movable', { uuid: unit.uuid, type: unit.details.type });
	}
	if (unit.details.size !== 1) {
		throw new DetailedError('moving is not supported for large units', { uuid: unit.uuid, type: unit.details.type });
	}
	logger.info(ctx, 'moving unit', { prev: unit.location.hash, next: tile.hash });
	if (tile.chunkLayer.units[tile.hash]) {
		logger.info(ctx, 'unit movement blocked', { hash: tile.hash, uuid: unit.uuid });
		await clearPath(ctx, unit);
		return;
	}

	const oldTile = (await getUnitLocs(ctx, unit))[0];
	await planetDB.chunkLayer.setEntity(ctx, tile.chunkLayer.hash, unit.movable.layer, unit.uuid, tile.hash);
	await planetDB.chunkLayer.clearEntity(ctx, oldTile.chunkLayer.hash, unit.movable.layer, unit.uuid, oldTile.hash);

	const location: Partial<UnitLocation> = {
		x: tile.x,
		y: tile.y,
		chunkX: tile.chunk.x,
		chunkY: tile.chunk.y,
		hash: [tile.hash],
		chunkHash: [tile.chunk.hash]
	};
	const movable: Partial<UnitMovable> = {
		movementCooldown: unit.movable.speed
	};

	if (tile.hash === unit.movable.destination) {
		movable.destination = '';
	}
	await planetDB.unit.patch(ctx, unit.uuid, { location, movable });
}

// returns the amount of resource that could be transfered
export async function sendResource(ctx: Context, type: Resource, amount: number, src: Unit, dest: Unit): Promise<number> {
	const planetDB = await db.getPlanetDB(ctx, src.location.map);

	if (!src.storage) {
		throw new DetailedError('source unit does not have storage', { uuid: src.uuid, type: src.details.type });
	}

	if (!dest.storage) {
		throw new DetailedError('destination unit does not have storage', { uuid: dest.uuid, type: src.details.type });
	}
	const maxField = type === 'iron' ? 'maxIron' : 'maxFuel';

	if ((dest.storage as any)[type] === dest.storage[maxField]) {
		logger.info(ctx, 'transfer ignored, already full');
		return 0;
	}

	if ((src.storage as any)[type] < amount) {
		logger.info(ctx, `transfer ignored, not enough vespene gas. i mean ${type}`);
		amount = (src.storage as any)[type];
		if (amount === 0) {
			return 0;
		}
	}

	const pulled: number = await planetDB.unit.pullResource(ctx, type, amount, src.uuid);
	if (pulled === 0) {
		return 0;
	}

	const pushed: number = await planetDB.unit.putResource(ctx, type, pulled, dest.uuid);
	if (pushed !== pulled) {
		// TODO attempt to return pulled resources
	}
	return pushed;
}

export async function getNearestEnemy(ctx: Context, unit: Unit): Promise<null | Unit> {
	const planetDB = await db.getPlanetDB(ctx, unit.location.map);
	const units = await planetDB.planet.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
	planetDB.planet.sortByNearestUnit(units, unit);

	for (const other of units) {
		if (other.details.owner && unit.details.owner !== other.details.owner) {
			return other;
		}
	}

	return null;
}