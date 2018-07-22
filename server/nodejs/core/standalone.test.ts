require('source-map-support').install();
import db from '../db/memoryDB';
import { setupDB } from '../db';
import Standalone from './standalone';
import Context from '../context';
import { prepareCtx } from '..';

describe('start standalone', async () => {
  let standalone: Standalone;
  let ctx: Context;

  it('should setup db', async () => {
    setupDB(db);
    ctx = await prepareCtx('standalone', db);
  });

  // these tests hang atm
  xit('should start standalone', async () => {
    standalone = new Standalone();
    await standalone.init(ctx);
    await standalone.start();
  });

  xit('should stop standalone', async () => {
    await standalone.stop();
  });
});
