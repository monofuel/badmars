/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';

import env from '../../config/env';
import MonoContext from '../../util/monoContext';

export default function route(ctx: MonoContext, app: express) {
	app.get('/', (req: express.Request, res: express.Response) => {
		ctx.logger.info(ctx, 'GET /', {}, { req });
		ctx.db.map.listNames().then((list: Array<string>) => {
			res.render('pages/index', {
				worlds: list,
			});
		});
	});

	app.get('/badmars', (req: express.Request, res: express.Response) => {

		const serverAddress: string = env.wsServer;

		res.render('pages/badmars', {
			user: req.user,
			server: serverAddress,
		});
	});
}
