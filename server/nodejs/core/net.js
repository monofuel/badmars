/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import Client from '../net/client';
import ws from 'ws';
import MonoContext from '../util/monoContext';

import type Logger from '../util/logger';
import type DB from '../db/db';

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
		const wss = new WebSocketServer({ port: env.wsPort });
		wss.on('connection', (ws: ws) => {
			new Client(ctx.create(), ws);
		});
		return Promise.resolve();
	}

	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}
}

