require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Chunk from './core/chunk';
import Context from './util/context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('chunk', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const chunk = new Chunk();
		await chunk.init(ctx);
		await chunk.start();
		ctx.info('READY');
	})
}

init();