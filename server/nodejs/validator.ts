require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Validator from './core/validator';
import Context from './util/context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('web', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const validator = new Validator();
		await validator.init(ctx);
		await validator.start();
		ctx.info('READY');
	})
}

init();