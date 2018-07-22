require('source-map-support').install();
import db from '../db/memoryDB';
import { setupDB } from '../db';
import Web from './web';
import Context from '../context';
import { prepareCtx } from '..';

describe('web', async () => {
  let web: Web;
  let ctx: Context;

  it('should setup db', async () => {
    setupDB(db);
    ctx = await prepareCtx('web', db);
  });

  it('should start web', async () => {
    web = new Web();
    await web.init(ctx);
    await web.start();
  });

  it('should stop web', async () => {
    await web.stop();
  });
});
