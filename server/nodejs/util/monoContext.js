/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Hat from 'hat';
import Context from 'node-context';

import type Logger from '../util/logger';
import type DB from '../db/db';

export default class MonoContext extends Context {
	db: DB;
	logger: Logger;
	constructor(opts: Object, db: DB, logger: Logger) {
		opts.uuid = Hat();
		super(opts);
		this.db = db;
		this.logger = logger;
	}
}