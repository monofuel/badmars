/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import Schema from './core/schema';
require('source-map-support').install();

const logger = new Logger('schema');
const db = new DB(logger);

async function init(): Promise<void> {
	try {
		logger.info(null, 'start begin');
		const schema = new Schema(db, logger);
		await schema.init();
		logger.info(null, 'start complete');

	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err.stack);
		logger.info(null, 'schema script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
}

init();