require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Validator from './core/validator';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	setupDB(db);
	const ctx = await prepareCtx('validator', db);
	await start(ctx, async (ctx: Context) => {
		const validator = new Validator();
		await validator.init(ctx);
		await validator.start();
		ctx.info('READY');
	})
}

init();