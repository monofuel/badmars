require('source-map-support').install();

import db from './db/memoryDB';
import { setupDB } from './db';
import Pathfinding from './core/pathfinding';
import Context from './context';
import { prepareCtx, start } from './';

async function init(): Promise<void> {
	setupDB(db);
	const ctx = await prepareCtx('pathfinder', db);
	await start(ctx, async (ctx: Context) => {
		const pathfinding = new Pathfinding();
		await pathfinding.init(ctx);
		await pathfinding.start();
		ctx.info('READY');
	})
}

init();