require('source-map-support').install();
import memoryDB from '../db/memoryDB';
import rethinkDB from '../db/rethinkDB';
import { setupDB } from '../db';
import Standalone from './standalone';
import Context from '../context';
import { prepareCtx } from '..';

describe('start standalone', async () => {
  describe('memoryDB', () => {
    let standalone: Standalone;
    let ctx: Context;

    it('should setup db', async () => {
      setupDB(memoryDB);
      ctx = await prepareCtx('standalone', memoryDB);
    });

    it('should start standalone', async () => {
      standalone = new Standalone();
      await standalone.init(ctx);
      await standalone.start();
    });

    it('should stop standalone', async () => {
      await standalone.stop();
    });
  });
  xdescribe('rethinkDB', () => {
    let standalone: Standalone;
    let ctx: Context;

    it('should setup db', async () => {
      setupDB(rethinkDB);
      ctx = await prepareCtx('standalone', rethinkDB);
    });

    it('should start standalone', async () => {
      standalone = new Standalone();
      await standalone.init(ctx);
      await standalone.start();
    });

    it('should stop standalone', async () => {
      await standalone.stop();
      await rethinkDB.stop(ctx);
    });
  });
});
