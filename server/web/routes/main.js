/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';

import env from '../../config/env';
import logger from '../../util/logger';
import db from '../../db/db';

const router = express.Router();

module.exports = (app) => {
	app.get('/', (req, res) => {
		logger.requestInfo("GET /", req);
		db.map.listNames().then((list) => {
			res.render('pages/index', {
				worlds: list,
				user: req.user
			});
		});
	});

	app.get('/badMars_v1', (req, res) => {

		var serverAddress = env.wsServer;
		var port = env.wsPublicPort;

		res.render('pages/badmars_v1', {
			user: req.user,
			server: serverAddress,
			port: port
		});
	});
};
