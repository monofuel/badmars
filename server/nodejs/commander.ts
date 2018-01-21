require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Commander from './util/commands';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	setupDB(db);
	const ctx = await prepareCtx('commander', db);
	await start(ctx, async (ctx: Context) => {
		const commander = new Commander();
		await commander.init(ctx);
		await commander.start();
		ctx.info('READY');
	})
}

init();