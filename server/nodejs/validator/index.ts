
import Context from '../context';
import db, * as DB from '../db';

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
}

export async function validatePlanets(ctx: Context): Promise<void> {
  // TODO
}

export async function validateUsers(ctx: Context): Promise<void> {
  // TODO
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

export async function validateUnits(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}

export async function validateUnitStats(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}

export async function validateFactoryQueues(ctx: Context, planet: DB.Planet): Promise<void> {
  // TODO
}
