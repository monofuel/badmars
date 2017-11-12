require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Web from './core/web';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
    const ctx = await prepareCtx('web', new RethinkDB());
    await start(ctx, async (ctx: Context) => {
        const web = new Web();
        await web.init(ctx);
        await web.start();
        ctx.info('READY');
    })
}

init();