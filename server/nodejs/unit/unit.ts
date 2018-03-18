
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import * as _ from 'lodash';
import Context from '../context';
import db from '../db';
import User from '../user';
import logger, { DetailedError, WrappedError } from '../logger';
import env from '../config/env';
import * as groundUnitAI from './ai/groundunit';
import AttackAI from './ai/attack';
import ConstructionAI from './ai/construction';
import TransferTowerAI from './ai/transferTower';
import * as mineAI from './ai/mine';
import PlanetLoc, { getLocationDetails } from '../map/planetloc';
import * as uuidv4 from 'uuid/v4';
import * as TileType from '../map/tiletypes';

// Functions that modify the unit directly should probably be in this file
async function patchUnit(ctx: Context, unit: Unit, patch: Partial<UnitPatch>): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  const patchedUnit = await planetDB.unit.patch(ctx, unit.uuid, patch);
  Object.assign(unit, patchedUnit);
}

// for creating new units
export async function newUnit(
  ctx: Context,
  type: string,
  loc: PlanetLoc | null,
  map?: string, x?: number, y?: number): Promise<Unit> {
  ctx.check('newUnit');
  let mapName: string = map as any;
  if (!loc) {
    if (!map) {
      throw new Error('must specify either a PlanetLoc or mapName, x and y');
    }
  } else {
    mapName = loc.map.name;
  }

  const planetDB = await db.getPlanetDB(ctx, mapName);
  const unitStats = await planetDB.unitStat.get(ctx, type);
  const optional: Partial<Unit> = {};

  if (unitStats.attack) {
    optional.attack = {
      ...unitStats.attack,
      fireCooldown: 0,
    };
  }

  if (unitStats.storage) {
    optional.storage = {
      ...unitStats.storage,
      resourceCooldown: 0,
      iron: 0,
      fuel: 0,
    };
  }

  if (unitStats.movable) {
    optional.movable = {
      ...unitStats.movable,
      movementCooldown: 0,
      path: [],
      movementAttempt: 0,
      pathAttempt: 0,
      isPathing: false,
      pathUpdate: 0,
      transferGoal: null,
    };
  }

  // hack for new units before chunk has loaded
  if (loc) {
    x = loc.x;
    y = loc.y;
  } else {
    if (x === undefined || y === undefined) {
      throw new Error('must specify x and y, or a planetLoc');
    }
  }

  let hash;
  if (unitStats.details.size === 1) {
    hash = [x + ':' + y];
  } else if (unitStats.details.size === 2) {
    hash = [
      (x) + ':' + (y),
      (x + 1) + ':' + (y),
      (x) + ':' + (y + 1),
      (x + 1) + ':' + (y + 1),
    ];
  } else if (unitStats.details.size === 3) {
    hash = [
      (x - 1) + ':' + (y - 1),
      (x) + ':' + (y - 1),
      (x + 1) + ':' + (y - 1),
      (x - 1) + ':' + (y),
      (x) + ':' + (y),
      (x + 1) + ':' + (y),
      (x - 1) + ':' + (y + 1),
      (x) + ':' + (y + 1),
      (x + 1) + ':' + (y + 1),
    ];
  } else {
    throw new DetailedError(
      'invalid unit size', { type, size: unitStats.details.size });
  }

  const chunkHash = new Set();

  let chunkX: number = 0;
  let chunkY: number = 0;
  hash.forEach((tileHash: string) => {
    const x = Number(tileHash.split(':')[0]);
    const y = Number(tileHash.split(':')[1]);
    const locDetails =
      getLocationDetails(x, y, planetDB.planet.settings.chunkSize);
    chunkX = locDetails.chunkX;
    chunkY = locDetails.chunkY;

    chunkHash.add(`${locDetails.chunkX}:${locDetails.chunkY}`);
  });

  const location = {
    map: mapName,
    x,
    y,
    hash,
    chunkX,
    chunkY,
    chunkHash: Array.from(chunkHash),
  };

  return {
    ...unitStats,
    uuid: uuidv4(),
    visible: false,
    details: {
      ...unitStats.details,
      type,
      ghosting: false,
      owner: '',
      health: unitStats.details.maxHealth,
      vision: unitStats.details.vision,
      lastTick: 0,
    },
    location,
    ...optional,
  };
}

export async function simulate(ctx: Context, unit: Unit): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  ctx.check('simulate');

  const actionPromises = [];
  const actionable = {
    mineAI: false,
    groundUnitAI: false,
    constructionAI: false,
    attackAI: false,
    transferTowerAI: false,
  };

  // ------------------
  // iron and oil resources do not need to do work
  if (unit.details.type === 'oil' || unit.details.type === 'iron') {
    return;
  }

  // ghosting units don't need to do work
  if (unit.details.ghosting) {
    return;
  }

  if (unit.details.health <= 0 && unit.details.maxHealth) {
    logger.info(ctx, 'unit destroyed', { uuid: unit.uuid });
    await planetDB.unit.delete(ctx, unit.uuid);
    return;
  }

  if (unit.details.fuelBurnLength && !await burnFuel(ctx, unit)) {
    // logger.info(ctx, 'unit out of fuel', { uuid: unit.uuid });
    await patchUnit(ctx, unit, {
      details: {
        // health: unit.details.health - 5,
        fuelBurn: unit.details.fuelBurnLength,
      },
    });
    return;
  }

  // ------------------
  // execute actionable promises
  // see what actions are possible
  const profile = logger.startProfile('unit_AI');

  const attackAI = new AttackAI();
  const constructionAI = new ConstructionAI();
  const transferTowerAI = new TransferTowerAI();

  if (unit.details.type === 'mine') {
    actionPromises.push(
      mineAI.actionable(ctx, unit)
        .then((result: boolean) => { actionable.mineAI = result; })
        .catch((err: Error) => {
          throw new WrappedError(err, 'mine actionable');
        }));
  }
  if (unit.movable) {
    switch (unit.movable.layer) {
      case 'ground':
        actionPromises.push(
          groundUnitAI.actionable(ctx, unit)
            .then((result: boolean) => {
              actionable.groundUnitAI = result;
            })
            .catch((err: Error) => {
              throw new WrappedError(err, 'groundUnitAI actionable');
            }));
    }
  }

  if (unit.attack) {
    actionPromises.push(
      attackAI.actionable(ctx, unit)
        .then((result: boolean) => { actionable.attackAI = result; })
        .catch((err: Error) => {
          throw new WrappedError(err, 'attackAI actionable');
        }));
  }

  if (unit.construct) {
    actionPromises.push(
      constructionAI.actionable(ctx, unit)
        .then((result: boolean) => {
          actionable.constructionAI = result;
        })
        .catch((err: Error) => {
          throw new WrappedError(err, 'constructionAI actionable');
        }));
  }
  actionPromises.push(
    transferTowerAI.actionable(ctx, unit)
      .then(
        (result: boolean) => { actionable.transferTowerAI = result; })
      .catch((err: Error) => {
        throw new WrappedError(err, 'transferTower actionable');
      }));
  ctx.check('pre actionable');
  try {
    await Promise.all(actionPromises);
  } catch (err) {
    throw new WrappedError(err, 'failed checking actionables');
  }

  ctx.check('pre action');
  // ------------------
  // actionable map is filled out
  // pick an action to perform
  try {
    if (actionable.mineAI) {
      logger.info(ctx, 'processing mine', {}, { silent: true });
      await mineAI.simulate(ctx, unit);
    } else if (actionable.transferTowerAI) {
      await transferTowerAI.simulate(ctx, unit);
    } else if (actionable.attackAI) {
      logger.info(ctx, 'processing attack');
      await attackAI.simulate(ctx, unit);
    } else if (actionable.groundUnitAI) {
      logger.info(ctx, 'processing ground AI', {}, { silent: true });
      await groundUnitAI.simulate(ctx, unit);
    } else if (actionable.constructionAI) {
      logger.info(ctx, 'processing construction', {}, { silent: true });
      await constructionAI.simulate(ctx, unit);
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
    throw new DetailedError(
      'unit cannot construct',
      { uuid: unit.uuid, type: unit.details.type });
  }

  const stats = await planetDB.unitStat.get(ctx, unitType);
  if (!stats) {
    throw new DetailedError(
      'cannot add invalid factory order',
      { uuid: unit.uuid, type: unitType });
  }

  const order: FactoryOrder = {
    uuid: uuidv4(),
    type: unitType,
    factory: unit.uuid,
    created: Date.now(),
  };

  await planetDB.factoryQueue.create(ctx, order);
}

export async function popFactoryOrder(ctx: Context, unit: Unit): Promise<any> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  if (!unit.construct) {
    throw new DetailedError(
      'unit cannot construct',
      { uuid: unit.uuid, type: unit.details.type });
  }
  return await planetDB.factoryQueue.pop(ctx, unit.uuid);
}

export async function addMovementAttempt(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }

  await patchUnit(
    ctx, unit,
    { movable: { movementAttempt: unit.movable.movementAttempt + 1 } });

  if (unit.movable.movementAttempt > ctx.env.movementAttemptLimit) {
    // re-path
    logger.info(ctx, 'unit re-pathing');
    await clearPath(ctx, unit);
  }
}

export async function addPathAttempt(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }

  await patchUnit(
    ctx, unit, { movable: { pathAttempt: unit.movable.pathAttempt + 1 } });

  if (unit.movable.pathAttempt > 20) {
    logger.info(ctx, 'unit giving up on pathing');
    await clearDestination(ctx, unit);
  }
}

export async function setTransferGoal(ctx: Context, unit: Unit, uuid: UUID, iron: number, fuel: number): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  const movable = {
    transferGoal: {
      uuid, iron, fuel,
    },
  };
  return patchUnit(ctx, unit, { movable });
}

export async function clearTransferGoal(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  const movable: Partial<UnitMovable> = {
    transferGoal: null,
  };
  return patchUnit(ctx, unit, { movable });
}

export async function setUnitDestination(ctx: Context, unit: Unit, x: number, y: number): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  const hash = x + ':' + y;
  const movable: Partial<UnitMovable> = {
    destination: hash,
    isPathing: false,
    path: [],
  };
  return await patchUnit(ctx, unit, { movable });
}

// pass dest to update for a new destination (eg: if the previous destination
// was occupied)
export async function setPath(ctx: Context, unit: Unit, path: any[], dest?: TileHash): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }

  const movable: Partial<UnitMovable> = { path, isPathing: false };
  if (dest) {
    movable.destination = dest;
  }
  return await patchUnit(ctx, unit, { movable });
}

export async function clearDestination(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  const movable: Partial<UnitMovable> = {
    destination: null,
    isPathing: false,
    path: [],
    movementAttempt: 0,
  };
  return patchUnit(ctx, unit, { movable });
}

export async function clearPath(ctx: Context, unit: Unit): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  const movable: Partial<UnitMovable> = {
    isPathing: false,
    path: [],
    movementAttempt: 0,
  };
  await planetDB.unit.patch(ctx, unit.uuid, { movable });
}

export async function tickMovement(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  const movable = {
    movementCooldown: --unit.movable.movementCooldown,
  };
  return patchUnit(ctx, unit, { movable });
}

export async function tickFireCooldown(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.attack) {
    throw new DetailedError(
      'unit can\'t attack', { uuid: unit.uuid, type: unit.details.type });
  }
  const attack = {
    fireCooldown: unit.attack.fireCooldown--,
  };
  await patchUnit(ctx, unit, { attack });
}

export async function armFireCooldown(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.attack) {
    throw new DetailedError(
      'unit can\'t attack', { uuid: unit.uuid, type: unit.details.type });
  }
  const attack = {
    fireCooldown: unit.attack.fireRate,
  };
  await patchUnit(ctx, unit, { attack });
}

export async function takeDamage(ctx: Context, unit: Unit, dmg: number): Promise<void> {
  if (unit.details.maxHealth === 0) {
    throw new DetailedError(
      'non-attackable unit attacked',
      { uuid: unit.uuid, type: unit.details.type });
  }
  const details = {
    health: unit.details.health - dmg,
  };
  if (details.health < 0) {
    details.health = 0;
  }
  await patchUnit(ctx, unit, { details });
}

export async function setConstructing(
  ctx: Context,
  unit: Unit,
  constructing: { type: string, remaining: number } | null): Promise<void> {
  if (!unit.construct) {
    throw new DetailedError('unit cannot construct');
  }
  await patchUnit(ctx, unit, { construct: { constructing } });
}

export async function tickConstruction(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.construct) {
    throw new DetailedError('unit cannot construct', { uuid: unit.uuid });
  }
  if (!unit.construct.constructing) {
    throw new DetailedError('unit is not currently constructing', { uuid: unit.uuid });
  }
  await patchUnit(ctx, unit, {
    construct: {
      constructing: {
        type: unit.construct.constructing.type,
        remaining: unit.construct.constructing.remaining - 1,
      },
    },
  });
}

export async function setBuilt(ctx: Context, unit: Unit): Promise<void> {
  await patchUnit(ctx, unit, { details: { ghosting: false } });
}

export async function tickResourceCooldown(ctx: Context, unit: Unit): Promise<void> {
  if (!unit.storage) {
    throw new DetailedError('unit has no storage', { uuid: unit.uuid });
  }
  let resourceCooldown = unit.storage.resourceCooldown - 1;
  if (resourceCooldown < 0) {
    resourceCooldown = ctx.env.resourceTicks;
  }
  const storage: Partial<UnitStorage> = {
    resourceCooldown,
  };
  await patchUnit(ctx, unit, { storage });
}

export async function destroy(ctx: Context, unit: Unit): Promise<void> {
  // TODO should probaly only destroy units at the end of a turn
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  await planetDB.unit.delete(ctx, unit.uuid);
}

export function unitDistance(src: Unit, dst: Unit): number {
  const deltaX = Math.abs(src.location.x - dst.location.x);
  const deltaY = Math.abs(src.location.y - dst.location.y);
  return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
}

export async function getUnitLocs(ctx: Context, unit: Unit): Promise<PlanetLoc[]> {
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

export async function getChunks(ctx: Context, unit: Unit): Promise<Chunk[]> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  ctx.check('getChunks');
  const promises: Array<Promise<Chunk>> = [];
  unit.location.chunkHash.forEach((hash: TileHash) => {
    const x = Number(hash.split(':')[0]);
    const y = Number(hash.split(':')[1]);
    promises.push(planetDB.planet.getChunkOld(ctx, x, y));
  });
  return Promise.all(promises);
}

export async function addToChunks(ctx: Context, unit: Unit): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  for (const loc of unit.location.hash) {
    const hashSplit = loc.split(':');
    const x = Number(hashSplit[0]);
    const y = Number(hashSplit[1]);
    const details =
      getLocationDetails(x, y, planetDB.planet.settings.chunkSize);
    const chunkHash = `${details.chunkX}:${details.chunkY}`;
    if (unit.details.type === 'iron' || unit.details.type === 'oil') {
      await planetDB.chunkLayer.setEntity(
        ctx, chunkHash, 'resource', unit.uuid, loc);
    } else {
      await planetDB.chunkLayer.setEntity(
        ctx, chunkHash, 'ground', unit.uuid, loc);
    }
  }
}

export async function clearFromChunks(ctx: Context, unit: Unit): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  ctx.check('clearFromChunks');
  for (const loc of unit.location.hash) {
    const hashSplit = loc.split(':');
    const x = Number(hashSplit[0]);
    const y = Number(hashSplit[1]);
    const details =
      getLocationDetails(x, y, planetDB.planet.settings.chunkSize);
    const chunkHash = `${details.chunkX}:${details.chunkY}`;
    if (unit.details.type === 'iron' || unit.details.type === 'oil') {
      await planetDB.chunkLayer.clearEntity(
        ctx, chunkHash, 'resource', unit.uuid, loc);
    } else {
      await planetDB.chunkLayer.clearEntity(
        ctx, chunkHash, 'ground', unit.uuid, loc);
    }
  }
}

export async function moveUnit(ctx: Context, unit: Unit, tile: PlanetLoc): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  ctx.check('moveUnit');

  if (!unit.movable) {
    throw new DetailedError(
      'unit is not movable', { uuid: unit.uuid, type: unit.details.type });
  }
  if (unit.details.size !== 1) {
    throw new DetailedError(
      'moving is not supported for large units',
      { uuid: unit.uuid, type: unit.details.type });
  }
  // logger.info(ctx, 'moving unit', { prev: unit.location.hash, next:
  // tile.hash });
  const tileType = tile.chunk.navGrid[tile.localX][tile.localY];

  // TODO should probalby use 'checkvalidforunit' on map
  if (tileType !== TileType.LAND) {
    logger.info(
      ctx, 'ground unit tried to move to tile that was not land',
      { hash: tile.hash, uuid: unit.uuid, tileType });
    await clearPath(ctx, unit);
    return;
  }
  if (tile.chunkLayer.ground[tile.hash]) {
    throw new DetailedError(
      'unit movement blocked by another unit',
      { hash: tile.hash, uuid: unit.uuid });
  }

  const oldTile = (await getUnitLocs(ctx, unit))[0];
  await planetDB.chunkLayer.setEntity(
    ctx, tile.chunkLayer.hash, unit.movable.layer, unit.uuid, tile.hash);
  await planetDB.chunkLayer.clearEntity(
    ctx, oldTile.chunkLayer.hash, unit.movable.layer, unit.uuid,
    oldTile.hash);

  const location: Partial<UnitLocation> = {
    x: tile.x,
    y: tile.y,
    chunkX: tile.chunk.x,
    chunkY: tile.chunk.y,
    hash: [tile.hash],
    chunkHash: [tile.chunk.hash],
  };
  const movable: Partial<UnitMovable> = {
    movementCooldown: unit.movable.speed,
  };

  if (tile.hash === unit.movable.destination) {
    movable.destination = '';
  }
  await planetDB.unit.patch(ctx, unit.uuid, { location, movable });
}

// returns the amount of resource that could be transfered
export async function sendResource(
  ctx: Context,
  type: Resource,
  amount: number, src: Unit, dest: Unit): Promise<number> {
  const planetDB = await db.getPlanetDB(ctx, src.location.map);

  if (!src.storage) {
    throw new DetailedError(
      'source unit does not have storage',
      { uuid: src.uuid, type: src.details.type });
  }

  if (!dest.storage) {
    throw new DetailedError(
      'destination unit does not have storage',
      { uuid: dest.uuid, type: src.details.type });
  }
  const maxField = type === 'iron' ? 'maxIron' : 'maxFuel';

  if ((dest.storage as any)[type] === dest.storage[maxField]) {
    logger.info(ctx, 'transfer ignored, already full');
    return 0;
  }

  if ((src.storage as any)[type] < amount) {
    logger.info(
      ctx, `transfer ignored, not enough vespene gas. i mean ${type}`);
    amount = (src.storage as any)[type];
    if (amount === 0) {
      return 0;
    }
  }

  const pulled: number =
    await planetDB.unit.pullResource(ctx, type, amount, src.uuid);
  if (pulled === 0) {
    return 0;
  }

  const pushed: number =
    await planetDB.unit.putResource(ctx, type, pulled, dest.uuid);
  if (pushed !== pulled) {
    // TODO attempt to return pulled resources
  }
  return pushed;
}

export async function getNearestEnemy(ctx: Context, unit: Unit): Promise<null | Unit> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  const units = await planetDB.planet.getNearbyUnitsFromChunk(
    ctx, unit.location.chunkHash[0]);
  planetDB.planet.sortByNearestUnit(units, unit);

  for (const other of units) {
    if (other.details.owner && unit.details.owner !== other.details.owner) {
      return other;
    }
  }

  return null;
}

// return if the unit has been able to burn fuel
export async function burnFuel(ctx: Context, unit: Unit): Promise<boolean> {
  if (!unit.details.fuelBurnLength) {
    return false;
  }
  if (!unit.storage) {
    throw new DetailedError('unit has no storage', { uuid: unit.uuid });
  }
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);

  let fuelBurn = unit.details.fuelBurnLength;
  if (!unit.details.fuelBurn) {
    const burned =
      await planetDB.unit.pullResource(ctx, 'fuel', 1, unit.uuid);
    if (burned <= 0) {
      // pull fuel from nearby
      if (await planetDB.planet.pullResource(
        ctx, 'fuel', unit, unit.storage.maxFuel)) {
        await planetDB.unit.putResource(
          ctx, 'fuel', unit.storage.maxFuel - 1, unit.uuid);
      } else if (burned <= 0) {
        await patchUnit(ctx, unit, { details: { unfueled: true } });
        return false;
      }
    }
  } else {
    fuelBurn = unit.details.fuelBurn - 1;
    if (unit.storage.fuel < unit.storage.maxFuel / 2 &&
      await planetDB.planet.pullResource(
        ctx, 'fuel', unit, unit.storage.maxFuel)) {
      await planetDB.unit.putResource(
        ctx, 'fuel', unit.storage.maxFuel - 1, unit.uuid);
    }
  }
  await patchUnit(ctx, unit, { details: { fuelBurn } });
  return true;
}

export async function isUnitVisible(ctx: Context, unit: Unit, user: User): Promise<boolean> {
  if (unit.details.owner === user.uuid) {
    return true;
  }

  // The unit is visible if any tiles the unit is on are visible
  const locs = await getUnitLocs(ctx, unit);

  for (const loc of locs) {
    if (await loc.isVisible(ctx, user)) {
      return true;
    }
  }
  return false;
}
export async function setReceiver(ctx: Context, unit: Unit, receive: boolean): Promise<void> {
  await patchUnit(ctx, unit, { storage: { receive } });
}
