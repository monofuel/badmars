/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';

import env from '../../config/env';
import logger from '../../util/logger';
import db from '../../db/db';

export default function route(app: express) {
	app.get('/', (req, res) => {
		logger.requestInfo('GET /', req);
		db.map.listNames().then((list) => {
			res.render('pages/index', {
				worlds: list,
				user: req.user
			});
		});
	});

	app.get('/badmars', (req, res) => {

		const serverAddress: string = env.wsServer;
		const port: string = env.wsPublicPort;

		res.render('pages/badmars', {
			user: req.user,
			server: serverAddress,
			port: port
		});
	});
}
