/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import path from 'path';

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';

import { Context } from 'node-context';

exports.init = () => {
	var app = express();

	app.set('view engine', 'ejs');
	app.set('trust proxy', true); //for accurate logs running behind a proxy

	app.use(express.static(path.join(__dirname, '/../public')));
	app.set('views', __dirname + '/../web/views');

	require('../web/routes/main')(app);
	require('../web/routes/management')(app);

	return new Promise((resolve, reject) => {
		var server = app.listen(env.wwwPort, () => {

			var host = server.address().address;
			var port = server.address().port;

			console.log('Express listening at http://%s:%s', host, port);
			resolve();
		});
	});
};
