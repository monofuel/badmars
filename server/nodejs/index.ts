import { DB } from './db';
import env from './config/env';
import Context from './util/context';
import Logger from './util/logger';

export async function prepareCtx(name: string, db: DB): Promise<Context> {
	const ctx = new Context({ env, name});
    try {
        ctx.logger = new Logger(name);
    } catch (err) {
        console.error(err);
        console.log('failed to start logger');
        process.exit(-1);
    }
    try {
        ctx.db = db;
        await ctx.db.init(ctx);
        ctx.info('parent context ready');

	} catch (err) {
		console.error(err);
		process.exit(-1);
	}
	return ctx;
}

export async function start(ctx: Context, fn: (ctx: Context) => Promise<void>): Promise<void> {
    try {
        await fn(ctx);
	} catch (err) {
		console.error(err);
		ctx.logger.info(ctx, 'main process caught error, exiting');
		ctx.logger.trackError(ctx, err);
		process.exit(-1);
	}
}