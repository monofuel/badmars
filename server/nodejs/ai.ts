require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import AI from './core/ai';
import Context from './util/context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('ai', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const ai = new AI();
		await ai.init(ctx);
		await ai.start();
		ctx.info('READY');
	})
}

init();