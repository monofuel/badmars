
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import AStarPath from '../nav/astarpath';
import SimplePath from '../nav/simplepath';
import Context from '../context';
import { WrappedError } from '../logger';
import {
  clearDestination,
  setPath,
  setUnitDestination,
  addPathAttempt,
} from '../unit/unit';

import logger from '../logger';
import db from '../db';
import PlanetLoc from '../map/planetloc';
import { Service } from './';
import sleep from '../util/sleep';
import aStarPath from '../nav/astarpath';
import { endProfile, startProfile } from '../util/stats';

type TileHash = string;
const registeredMaps: any = [];

export default class PathfindService implements Service {
  private parentCtx!: Context;
  public async init(ctx: Context): Promise<void> { this.parentCtx = ctx; }

  public async start(): Promise<void> {
    const ctx = this.parentCtx.create();
    setInterval((): Promise<void> => this.registerListeners(ctx), 1000);

    await this.registerListeners(ctx);

    const maps: string[] = await db.listPlanetNames(ctx);
    for (const mapName of maps) {
      const planetDB = await db.getPlanetDB(ctx, mapName);
      let unit: Unit | null;
      // tslint:disable-next-line
      while (unit = await planetDB.unit.getUnprocessedPath(ctx)) {
        if (!unit) {
          continue;
        }
        await this.pathfind(ctx, unit);
      }
    }
  }

  public async registerListeners(ctx: Context): Promise<void> {
    const names: string[] = await db.listPlanetNames(ctx);
    for (const name of names) {
      if (registeredMaps.indexOf(name) === -1) {
        ctx = ctx.create();
        registeredMaps.push(name);
        const planetDB = await db.getPlanetDB(ctx, name);
        await planetDB.unit.watchPathing(ctx, this.pathfind);
      }
    }
  }

  private async pathfind(ctx: Context, unit: Unit, oldUnit?: Unit):
    Promise<void> {
    if (!unit.movable || !unit.movable.destination) {
      return;
    }

    logger.info(
      ctx, 'processing path',
      { uuid: unit.uuid, attempt: unit.movable.pathAttempt });
    const planetDB = await db.getPlanetDB(ctx, unit.location.map);
    const map = planetDB.planet;
    await planetDB.unit.patch(ctx, unit.uuid, { movable: { isPathing: true } });

    if (unit.movable.layer !== 'ground') {
      return;
    }

    const start = await map.getLoc(ctx, unit.location.x, unit.location.y);
    if (!await checkCanMove(ctx, unit)) {
      // don't retry immediately
      await sleep(1000);
      await planetDB.unit.patch(ctx, unit.uuid, { movable: { isPathing: false } });
      await addPathAttempt(ctx, unit);
      return;
    }

    const dest: PlanetLoc =
      await map.getLocFromHash(ctx, unit.movable.destination);

    // if the destination is covered, get the nearest valid point.
    const end: PlanetLoc | null = await map.getNearestFreeTile(ctx, dest, unit, false);
    if (!end) {
      throw new Error('no nearby free tile?');
    }
    if (start.equals(end)) {
      // done pathing, end
      await clearDestination(ctx, unit);
      return;
    }
    try {
      const prof = startProfile('astarPath');
      const path = await aStarPath(ctx, unit, start, end);
      endProfile(prof);
      await setPath(ctx, unit, path, dest.hash);
    } catch (err) {
      await clearDestination(ctx, unit);
      logger.trackError(ctx, err);
    }
  }

  public async stop(): Promise<void> {
    this.parentCtx.info('stopping standalone');
    // TODO stop watching for paths
  }
}

async function checkCanMove(ctx: Context, unit: Unit): Promise<boolean> {
  const planetDB = await db.getPlanetDB(ctx, unit.location.map);
  const start =
    await planetDB.planet.getLoc(ctx, unit.location.x, unit.location.y);
  const neighbors = [
    await start.N(ctx),
    await start.E(ctx),
    await start.S(ctx),
    await start.W(ctx),
  ];
  for (const tile of neighbors) {
    if (planetDB.planet.checkValidForUnit(ctx, [tile], unit, false)) {
      return true;
    }
  }
  return false;
}
