import { DB } from './db';
import env from './config/env';
import Context from './context';
import logger from './logger';

export async function prepareCtx(name: string, db: DB): Promise<Context> {
	const ctx = new Context({ env, name });
	try {
		logger.init(name);
	} catch (err) {
		console.error(err);
		console.log('failed to start logger');
		process.exit(-1);
	}
	try {
		db.init(ctx);
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
		logger.info(ctx, 'main process caught error, exiting');
		logger.trackError(ctx, err);
		process.exit(-1);
	}
}

process.on('unhandledRejection', (err, p) => {
	console.error('unhandled rejection', p, err);
	logger.trackError(null, err);
	process.exit(1);
});