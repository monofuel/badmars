
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as express from 'express';
import * as util from 'util';

import { Service } from '.';
import env from '../config/env';
import healthRoute from '../web/routes/health';
import Context from '../context';
import logger from '../logger';

export default class HealthService implements Service {
	private parentCtx: Context;
	async init(ctx: Context): Promise<void> {
		this.parentCtx = ctx;
	}

	async start(): Promise<void> {
		const app = express();
		const ctx = this.parentCtx.create();

		healthRoute(ctx.create(), app);

		return new Promise<void>((resolve: Function) => {
			const server = app.listen(env.wwwPort, () => {

				const host = server.address().address;
				const port = server.address().port;

				logger.info(ctx, util.format('Express listening at http://%s:%s', host, port));
				resolve();
			});
		});


	}
	async stop(): Promise<void> {
		this.parentCtx.info('stopping health check service');
	}
}