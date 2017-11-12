require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Standalone from './core/standalone';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
    setupDB(db);
    const ctx = await prepareCtx('standalone', db);
    await start(ctx, async (ctx: Context) => {
        const standalone = new Standalone();
        await standalone.init(ctx);
        await standalone.start();
        ctx.info('READY');
    })
}

init();