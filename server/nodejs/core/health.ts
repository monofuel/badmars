
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as express from 'express';
import * as util from 'util';

import env from '../config/env';
import healthRoute from '../web/routes/health';
import Context from '../util/context';

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

		return new Promise<void>((resolve: Function) => {
			const server = app.listen(env.wwwPort, () => {

				const host = server.address().address;
				const port = server.address().port;

				ctx.logger.info(ctx, util.format('Express listening at http://%s:%s', host, port));
				resolve();
			});
		});
	}

	makeCtx(timeout?: number): Context {
		return new Context({ timeout }, this.db, this.logger);
	}

}