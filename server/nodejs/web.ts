
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import Web from './core/web';
require('source-map-support').install();

const logger = new Logger('web');
const db = new DB(logger);

async function init(): Promise<void> {
	try {
		logger.info(null, 'start begin');
		await db.init();
		logger.info(null, 'db ready');

		const web = new Web(db, logger);
		await web.init();
		logger.info(null, 'start complete');

	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err.stack);
		logger.info(null, 'web script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
}

init();