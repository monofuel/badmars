require('source-map-support').install();
import { MemoryDB } from './db/memoryDB';
import { CheckingDB } from './db/checkingDB';
// import RethinkDB from './db/rethinkDB';
import { setupDB } from './db';
import Standalone from './core/standalone';
import Context from './context';
import { prepareCtx, start } from '.';
import logger from './logger';

async function init(): Promise<void> {
  // TODO once CheckingDB is working, use it to check rethink vs memory
  const db = new CheckingDB(new MemoryDB(), new MemoryDB());
  setupDB(db);
  await start(await prepareCtx('standalone', db), async (ctx: Context) => {
    const standalone = new Standalone();
    await standalone.init(ctx);
    await standalone.start();
    ctx.info('READY');

    process.on('SIGTERM', async () => {
      logger.info(ctx, 'got SIGTERM');
      await standalone.stop();
      await db.stop(ctx);
      process.exit(0);
    });
    process.on('SIGUSR2', async () => {
      logger.info(ctx, 'got SIGUSR2');
      await standalone.stop();
      await db.stop(ctx);
      process.exit(0);
    });
  });
}

init().catch((err) => {
  console.error('caught error in main promise');
  console.error(err);
});
