/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import {init as statInit} from './util/stats';
import Health from './core/health';
import AI from './core/AI';
require('source-map-support').install();

const logger = new Logger('ai');
const db = new DB(logger);
statInit(logger);

async function init(): Promise<void> {
	try {
		logger.info(null, 'start begin');
		await db.init();
		logger.info(null, 'db ready');

		const ai = new AI(db, logger);
		await ai.init();
		logger.info(null, 'ai service started');

		const health = new Health(db, logger);
		await health.init();
		logger.info(null, 'READY');

	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err.stack);
		logger.info(null, 'ai script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
}

init();