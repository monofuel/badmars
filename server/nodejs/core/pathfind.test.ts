require('source-map-support').install();
import db from '../db/memoryDB';
import { setupDB } from '../db';
import Pathfind from './pathfinding';
import Context from '../context';
import { prepareCtx } from '..';

describe('pathfind', async () => {
  let pathfind: Pathfind;
  let ctx: Context;

  it('should setup db', async () => {
    setupDB(db);
    ctx = await prepareCtx('pathfind', db);
  });

  it('should start pathfind', async () => {
    pathfind = new Pathfind();
    await pathfind.init(ctx);
    await pathfind.start();
  });

  it('should stop pathfind', async () => {
    await pathfind.stop();
  });
});
