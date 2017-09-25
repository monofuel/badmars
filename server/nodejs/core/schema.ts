
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../util/context';

import Logger from '../util/logger';
import DB from '../db/db';

export default class SchemaService {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}


	makeCtx(timeout?: number): Context {
		return new Context({ timeout }, this.db, this.logger);
	}	

	async init(): Promise<void> {
		// const ctx = this.makeCtx();
		await this.db.setupSchema();

		process.exit();
	}


}