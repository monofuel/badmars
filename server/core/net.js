/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Client from '../net/client';
import ws from 'ws';
import context from 'node-context';

const WebSocketServer = ws.Server;

const KEEP_ALIVE = 5000;
var wss;

exports.init = () => {
	wss = new WebSocketServer({ port: env.wsPort });
	wss.on('connection', (ws) => {
		new Client(ws);
	});
};
