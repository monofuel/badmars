
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as express from 'express';
import * as path from 'path';
import * as util from 'util';

import env from '../config/env';

import { Service } from './';

import mainRoute from '../web/routes/main';
import managementRoute from '../web/routes/management';
import healthRoute from '../web/routes/health';

import Context from '../util/context';

export default class WebService implements Service {
	private parentCtx: Context;
	async init(ctx: Context): Promise<void> {
		this.parentCtx = ctx;
	}
	
	async start(): Promise<void> {
		const app = express();

		app.set('view engine', 'ejs');
		app.set('trust proxy', true); //for accurate logs running behind a proxy
		app.use(express.static(path.join(__dirname, '../../../public/badmars/')));
		app.set('views', path.join(__dirname,'../web/views'));

		mainRoute(this.parentCtx.create(), app);
		managementRoute(this.parentCtx.create(), app);
		healthRoute(this.parentCtx.create(), app);

		return new Promise<void>((resolve: Function) => {
			const server = app.listen(env.wwwPort, () => {
				const ctx = this.parentCtx.create();
				const { logger } = ctx;

				const host = server.address().address;
				const port = server.address().port;

				logger.info(ctx, util.format('Express listening at http://%s:%s', host, port));
				resolve();
			});
		});
	}

	async stop(): Promise<void> {
        this.parentCtx.info('stopping web');
        throw new Error('not implemented');
    }
}