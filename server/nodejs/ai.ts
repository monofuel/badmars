require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import AI from './core/AI';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
  setupDB(db);
  const ctx = await prepareCtx('ai', db);
  await start(ctx, async (ctx: Context) => {
    const ai = new AI();
    await ai.init(ctx);
    await ai.start();
    ctx.info('READY');
  });
}

init().catch((err) => {
  console.error('caught error in main promise');
  console.error(err);
});
