require('source-map-support').install();
import db from './db/rethinkDB';
import { setupDB } from './db';
import Standalone from './core/standalone';
import Context from './context';
import { prepareCtx, start } from '.';
import logger from './logger';

async function init(): Promise<void> {
    setupDB(db);
    const ctx = await prepareCtx('standalone', db);
    await start(ctx, async (ctx: Context) => {
        const standalone = new Standalone();
        await standalone.init(ctx);
        await standalone.start();
        ctx.info('READY');

        process.on('SIGTERM', async () => {
            logger.info(ctx, 'got SIGTERM')
            await standalone.stop();
            await db.stop(ctx);
            process.exit(0);
        })
        process.on('SIGUSR2', async () => {
            logger.info(ctx, 'got SIGUSR2')
            await standalone.stop();
            await db.stop(ctx);
            process.exit(0);
        })
    })
}

init();