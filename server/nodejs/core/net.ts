
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import env from '../config/env';
import Client from '../net/client';
import * as ws from 'ws';
import Context from '../context';
import * as querystring from 'querystring';

import { Service } from './';
import logger from '../logger';
import db from '../db';
import * as http from 'http';

const WebSocketServer = ws.Server;

export default class Net implements Service {
  private wss!: ws.Server;
  private parentCtx!: Context;

  public async init(ctx: Context): Promise<void> { this.parentCtx = ctx; }

  public async start(): Promise<void> {
    const ctx = this.parentCtx.create();

    async function verifyClient(
      info: { origin: string, secure: boolean, req: http.IncomingMessage },
      callback: (res: boolean, code?: number, message?: string) => void):
      Promise<void> {

      const urlSplit = (info.req.url as any).split('?');
      if (urlSplit.length !== 2) {
        callback(false, 400, 'missing parameters');
      }

      const { token } = querystring.parse(urlSplit[1]);
      if (!token || typeof token !== 'string') {
        callback(false, 401, 'missing token parameter');
        return;
      }
      const useruuid = await db.session.getBearerUser(ctx, token);
      if (!useruuid) {
        callback(false, 401, 'invalid authorization');
        return;
      }
      const user = await db.user.get(ctx, useruuid);
      if (!user) {
        callback(false, 401, 'missing user');
        return;
      }
      logger.info(ctx, 'user connected', { username: user.username });

      (info.req as any).user = user;

      callback(true);
    }

    this.wss = new WebSocketServer({ port: ctx.env.wsPort, verifyClient });
    this.wss.on('connection', (ws: ws, req: http.IncomingMessage) =>
      new Client(ctx.create(), ws, req),
    );
    return Promise.resolve();
  }

  public async stop(): Promise<void> {
    this.parentCtx.info('stopping net');
    await this.wss.close();
  }
}
