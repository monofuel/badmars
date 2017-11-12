require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Net from './core/net';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('net', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const net = new Net();
		await net.init(ctx);
		await net.start();
		ctx.info('READY');
	})
}

init();