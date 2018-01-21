require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Web from './core/web';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
    setupDB(db);
    const ctx = await prepareCtx('web', db);
    await start(ctx, async (ctx: Context) => {
        const web = new Web();
        await web.init(ctx);
        await web.start();
        ctx.info('READY');
    })
}

init();