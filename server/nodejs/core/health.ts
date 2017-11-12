
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as express from 'express';
import * as util from 'util';

import env from '../config/env';
import healthRoute from '../web/routes/health';
import Context from '../context';

export default class HealthService {
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

				ctx.logger.info(ctx, util.format('Express listening at http://%s:%s', host, port));
				resolve();
			});
		});
	}
}