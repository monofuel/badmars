require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Validator from './core/validator';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
  setupDB(db);
  await start(await prepareCtx('validator', db), async (ctx: Context) => {
    const validator = new Validator();
    await validator.init(ctx);
    await validator.start();
    ctx.info('READY');
  });
}

init().catch((err) => {
  console.error('caught error in main promise');
  console.error(err);
});
