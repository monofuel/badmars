/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import path from 'path';
import util from 'util';

import env from '../config/env';
import logger from '../util/logger';

import mainRoute from '../web/routes/main';
import managementRoute from '../web/routes/management';

export async function init(): Promise<void> {
	const app: express = express();

	app.set('view engine', 'ejs');
	app.set('trust proxy', true); //for accurate logs running behind a proxy

	app.use(express.static(path.join(__dirname, '../../../public/badmars')));
	app.set('views', path.join(__dirname,'../web/views'));

	mainRoute(app);
	managementRoute(app);

	return new Promise((resolve: Function) => {
		const server = app.listen(env.wwwPort, () => {

			const host = server.address().address;
			const port = server.address().port;

			logger.info(util.format('Express listening at http://%s:%s', host, port));
			resolve();
		});
	});
}
