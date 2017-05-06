/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import {init as statInit} from './util/stats';
import Commands from './util/commands';

const logger = new Logger('ai');
const db = new DB(logger);
statInit(logger);


async function init(): Promise<void> {
	try {
		logger.info(null, 'start begin');
		await db.init();
		logger.info(null, 'db ready');

		const commands = new Commands(db, logger);
		await commands.init();
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err.stack);
		logger.info(null, 'commander script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
}

init();
