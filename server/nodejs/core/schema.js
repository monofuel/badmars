/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../util/monoContext';

import type Logger from '../util/logger';
import type DB from '../db/db';

export default class SchemaService {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}


	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}	

	async init(): Promise<void> {
		// const ctx = this.makeCtx();

		process.exit();
	}


}