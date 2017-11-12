require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Schema from './core/schema';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('schema', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const schema = new Schema();
		await schema.init(ctx);
		await schema.start();
		ctx.info('READY');
	})
}

init();