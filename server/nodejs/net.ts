require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Net from './core/net';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	setupDB(db);
	const ctx = await prepareCtx('net', db);
	await start(ctx, async (ctx: Context) => {
		const net = new Net();
		await net.init(ctx);
		await net.start();
		ctx.info('READY');
	})
}

init();