
import { assert, expect } from 'chai';
import Context from '../context';
import db, * as DB from '../db';
import * as uuid from 'uuid';
import logger, { WrappedError } from '../logger';
import User from '../user';
import PlanetLoc from '../map/planetloc';

export async function validateAll(parentCtx: Context): Promise<void> {
  const ctx = parentCtx.create({ name: 'validation' });
  await validatePlanets(ctx);
  await validateUsers(ctx);
  await validateSessions(ctx);
  await validateEvents(ctx);

  for (const planetName of await db.listPlanetNames(ctx)) {
    const planetDB = await db.getPlanetDB(ctx, planetName);
    await validateChunks(ctx, planetDB);
    await validateChunkLayers(ctx, planetDB);
    await validateUnits(ctx, planetDB);
    await validateUnitStats(ctx, planetDB);
    await validateFactoryQueues(ctx, planetDB);
  }
  logger.info(ctx, 'validation complete');
}

export async function validatePlanets(ctx: Context): Promise<void> {
  const planets = await db.listPlanetNames(ctx);
  for (const planetName of planets) {
    const planetDB = await db.getPlanetDB(ctx, planetName);
    await validatePlanet(ctx, planetDB);
  }
  logger.info(ctx, 'validated planets', { count: planets.length });
}
export async function validatePlanet(ctx: Context, planetDB: DB.Planet): Promise<void> {
  const planet = planetDB.planet;
  const settings = planet.settings;
  assert(planet.name.length > 0);
  assert(planet.lastTick >= 0);
  assert(planet.lastTickTimestamp >= 0);
  assert(planet.tps > 0);
  assert.exists(planet.seed);
  assert.exists(planet.paused);
  for (const userUUID of planet.users) {
    const user = await db.user.get(ctx, userUUID);
    assert.exists(user);
  }
  // TODO validate settings
}

export async function validateUsers(ctx: Context): Promise<void> {
  const users = await db.user.list(ctx);
  for (const user of users) {
    await validateUser(ctx, user);
  }
  logger.info(ctx, 'validated users', { count: users.length });
}

export async function validateUser(ctx: Context, user: User): Promise<void> {
  assert(user.uuid.length > 0);
  assert(user.username.length > 0);
  assert(user.email.length > 0);
  assert(user.passwordHash.length > 0);
  if (user.location) {
    validateHash(user.location);
  }
}

export async function validateSessions(ctx: Context): Promise<void> {
  // TODO
}

export async function validateEvents(ctx: Context): Promise<void> {
  // TODO
}

export async function validateChunks(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}

export async function validateChunkLayers(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}

export async function validateUnits(ctx: Context, planetDB: DB.Planet): Promise<void> {
  const planet = planetDB.planet;
  let count = 0;
  await planetDB.unit.each(ctx, async (ctx: Context, unit: Unit) => {
    count++;
    assert(unit.uuid.length > 0);
    assert.exists(unit.details);
    assert(unit.details.type.length > 0);
    // TODO unitStat should always throw an error if it doesn't exist
    const unitStats = await planetDB.unitStat.get(ctx, unit.details.type);
    assert.exists(unitStats);
    assert.exists(unit.location);
    for (const hash of unit.location.hash) {
      await validateLocHash(ctx, planetDB, hash);
    }

    for (const hash of unit.location.chunkHash) {
      await validateChunkHash(ctx, planetDB, hash);
    }

    assert.isNumber(unit.location.x);
    assert.isNumber(unit.location.y);
    assert.isNumber(unit.location.chunkX);
    assert.isNumber(unit.location.chunkY);

    assert.equal(unit.location.map, planet.name);
    if (unit.details.type === 'mine') {
      const loc: PlanetLoc = await planet.getLocFromHash(ctx, unit.location.hash[0]);
      const unitsAtTile: Unit[] = await loc.getUnits(ctx);
      const resource = unitsAtTile.find((unit: Unit) => unit.details.type === 'iron' || unit.details.type === 'oil');
      assert.exists(resource);
      assert.deepEqual(unit.location.hash, resource.location.hash);
    }

  });
  logger.info(ctx, 'validated units', { count });
}

export async function validateUnitStats(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}

export async function validateFactoryQueues(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}

export async function validateLocHash(ctx: Context, planetDB: DB.Planet, hash: string): Promise<void> {
  validateHash(hash);
  const loc = planetDB.planet.getLocFromHash(ctx, hash);
}

export async function validateChunkHash(ctx: Context, planetDB: DB.Planet, hash: string): Promise<void> {
  validateHash(hash);
  const loc = planetDB.planet.getChunk(ctx, hash);
}
export function validateHash(hash: string): void {
  assert(hash.includes(':'));
  const [xStr, yStr] = hash.split(':');
  const x = Number(xStr);
  const y = Number(yStr);
  assert.isNumber(x);
  assert.isNumber(y);
}
