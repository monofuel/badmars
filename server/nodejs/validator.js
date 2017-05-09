/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import Validator from './core/validator';
require('source-map-support').install();

const logger = new Logger('validator');
const db = new DB(logger);

async function init(): Promise<void> {
	try {
		logger.info(null, 'start begin');
		await db.init();
		logger.info(null, 'db ready');

		const validator = new Validator(db, logger);
		await validator.init();
		logger.info(null, 'start complete');

	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err.stack);
		logger.info(null, 'validator script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
}

init();