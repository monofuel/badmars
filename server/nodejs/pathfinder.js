/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import Health from './core/health';
import Pathfinder from './core/pathfinding';
import env from './config/env';
require('source-map-support').install();

const logger = new Logger('pathfinder');
const db = new DB(logger);

async function init(): Promise<void> {
	try {
		logger.info(null, 'start begin');
		await db.init();
		logger.info(null, 'db ready');

		const pathfinder = new Pathfinder(db, logger);
		await pathfinder.init();
		logger.info(null, 'pathfinder service started');

		if (env.envType === 'prod') {
			const health = new Health(db, logger);
			await health.init();
		}
		logger.info(null, 'READY');

	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err.stack);
		logger.info(null, 'pathfinder script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
}

init();