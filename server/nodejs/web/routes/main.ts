
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as express from 'express';
import Context from '../../context';
import logger from '../../logger';

export default function route(ctx: Context, app: express.Application) {
	app.get('/', (req: express.Request, res: express.Response) => {
		logger.info(ctx, 'GET /', {}, { req });
		res.render('pages/index');
	});

	app.get('/login', (req: express.Request, res: express.Response) => {
		logger.info(ctx, 'GET /login', {}, { req });
		res.render('pages/index');
	});

	app.get('/badmars', (req: express.Request, res: express.Response) => {
		logger.info(ctx, 'GET /badmars', {}, { req });
		res.render('pages/badmars');
	});
}
