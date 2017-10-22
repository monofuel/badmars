require('source-map-support').install();

import MemoryDB from './db/memoryDB';
import Logger from './util/logger';
import Standalone from './core/standalone';
import env from './config/env';

import Context from './util/context';

async function init(): Promise<void> {
    const ctx = new Context({ env, name: 'standalone' });
    try {
        ctx.logger = new Logger('standalone');
    } catch (err) {
        console.error(err);
        console.log('failed to start logger');
        process.exit(-1);
    }
    try {
        ctx.db = new MemoryDB();

        ctx.info('standalone starting');

        await ctx.db.init(ctx);
        ctx.info('db ready');
        const standalone = new Standalone();
        await standalone.init(ctx);
        await standalone.start();
        ctx.info('READY');

	} catch (err) {
		console.error(err);
		ctx.logger.info(null, 'standalone caught error, exiting');
		ctx.logger.trackError(null, err);
		process.exit(-1);
	}
}

init();