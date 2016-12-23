/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import { exec } from 'child_process';

import env from '../../config/env';
import logger from '../../util/logger';
import db from '../../db/db';

const router = express.Router();

module.exports = (app) => {
	app.get('/management/pull', (req, res) => {
		logger.requestInfo("GET /management/pull", req);
		exec('sh update.sh', (err, stdout, stderr) => {
			if(err) {
				logger.error(err);
			}
		});
		res.json(JSON.stringify({ success: true }));
	});
};
