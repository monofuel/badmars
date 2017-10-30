require('source-map-support').install();

import MemoryDB from './db/memoryDB';
import Standalone from './core/standalone';
import Context from './util/context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
    const ctx = await prepareCtx('standalone', new MemoryDB());
    await start(ctx, async (ctx: Context) => {
        const standalone = new Standalone();
        await standalone.init(ctx);
        await standalone.start();
        ctx.info('READY');
    })
}

init();