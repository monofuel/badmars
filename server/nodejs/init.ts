
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import DB from './db/db';
import Logger from './util/logger';
import Chunk from './core/chunk';

const logger = new Logger('chunk');
const db = new DB(logger);

export default async function init(moduleName: string): Promise<void> {
	try {
		logger.info(null, 'start begin');
		await db.init();
		switch (moduleName) {
		case 'chunk':
			const chunk = new Chunk(db, logger);
			await chunk.init();
		}
		logger.info(null, 'start complete');

	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err);
		logger.info(null, 'chunk script caught error, exiting');
		logger.trackError(null, err);
		process.exit(-1);
	}
};