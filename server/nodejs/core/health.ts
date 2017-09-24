
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import util from 'util';

import env from '../config/env';
import healthRoute from '../web/routes/health';
import MonoContext from '../util/monoContext';

import Logger from '../util/logger';
import DB from '../db/db';

export default class HealthService {
	db: DB;
	logger: Logger;

	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	async init(): Promise<void> {
		const app = express();
		const ctx = this.makeCtx();

		healthRoute(ctx.create(), app);

		return new Promise((resolve: Function) => {
			const server = app.listen(env.wwwPort, () => {

				const host = server.address().address;
				const port = server.address().port;

				ctx.logger.info(ctx, util.format('Express listening at http://%s:%s', host, port));
				resolve();
			});
		});
	}

	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}

}