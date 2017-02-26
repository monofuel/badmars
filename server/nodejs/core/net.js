/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import Client from '../net/client';
import ws from 'ws';

const WebSocketServer = ws.Server;

exports.init = () => {
	const wss = new WebSocketServer({ port: env.wsPort });
	wss.on('connection', (ws: ws) => {
		new Client(ws);
	});
};
