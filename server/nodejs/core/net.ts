
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import Client from '../net/client';
import ws from 'ws';
import MonoContext from '../util/monoContext';
import querystring from 'querystring';

import Logger from '../util/logger';
import DB from '../db/db';
import * as http from 'http';

const WebSocketServer = ws.Server;

export default class Net {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	async init(): Promise<void> {
		const ctx = this.makeCtx();

		async function verifyClient(info: { origin: string, secure: boolean, req: http.IncomingMessage },
			callback: (res: boolean, code?: number, message?: string) => void): Promise<void> {

			const urlSplit = info.req.url.split('?');
			if (urlSplit.length != 2) {
				callback(false, 400, 'missing parameters');
			}

			const { token } = querystring.parse(urlSplit[1]);
			if (!token) {
				callback(false, 401, 'missing token parameter');
				return;
			}

			const { logger, db } = ctx;
			const user = await db.session.getBearerUser(ctx, token);
			if (!user) {
				callback(false, 401, 'invalid authorization');
				return;
			}

			logger.info(ctx, 'user connected', { username: user.name });

			// $FlowFixMe: silly
			info.req.user = user;

			callback(true);
		}

		const wss = new WebSocketServer({ port: env.wsPort, verifyClient });
		wss.on('connection', (ws: ws) => {
			new Client(ctx.create(), ws);
		});
		return Promise.resolve();
	}

	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}
}