/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import path from 'path';
import util from 'util';

import env from '../config/env';

import mainRoute from '../web/routes/main';
import managementRoute from '../web/routes/management';
import healthRoute from '../web/routes/health';

import MonoContext from '../util/monoContext';

import type Logger from '../util/logger';
import type DB from '../db/db';

export default class WebService {
	db: DB;
	logger: Logger;

	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	async init(): Promise<void> {
		const app = express();
		const ctx = this.makeCtx();

		app.set('view engine', 'ejs');
		app.set('trust proxy', true); //for accurate logs running behind a proxy
		app.use(express.static(path.join(__dirname, '../../../bin/public/badmars')));
		app.set('views', path.join(__dirname,'../web/views'));

		mainRoute(ctx.create(), app);
		managementRoute(ctx.create(), app);
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