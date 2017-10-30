require('source-map-support').install();

import RethinkDB from './db/rethinkDB';
import Pathfinding from './core/pathfinding';
import Context from './util/context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	const ctx = await prepareCtx('pathfinding', new RethinkDB());
	await start(ctx, async (ctx: Context) => {
		const pathfinding = new Pathfinding();
		await pathfinding.init(ctx);
		await pathfinding.start();
		ctx.info('READY');
	})
}

init();