require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Commander from './util/commands';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('net', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const commander = new Commander();
		await commander.init(ctx);
		await commander.start();
		ctx.info('READY');
	})
}

init();