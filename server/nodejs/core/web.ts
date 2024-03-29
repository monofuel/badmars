
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import * as express from 'express';
import * as http from 'http';
import * as path from 'path';
import * as util from 'util';
import * as bodyParser from 'body-parser';

import env from '../config/env';

import { Service } from './';

import mainRoute from '../web/routes/main';
import managementRoute from '../web/routes/management';
import healthRoute from '../web/routes/health';
import authRoute from '../web/routes/auth';

import Context from '../context';
import logger from '../logger';

export default class WebService implements Service {
  private server!: http.Server;
  private parentCtx!: Context;
  public async init(ctx: Context): Promise<void> { this.parentCtx = ctx; }

  public async start(): Promise<void> {
    const app = express();

    app.set('view engine', 'ejs');
    app.set('trust proxy', true);  // for accurate logs running behind a proxy
    app.use(express.static(path.join(__dirname, '../../../public/badmars/')));
    app.set('views', path.join(__dirname, '../web/views'));
    app.use(bodyParser.json());

    mainRoute(this.parentCtx.create(), app);
    managementRoute(this.parentCtx.create(), app);
    healthRoute(this.parentCtx.create(), app);
    authRoute(this.parentCtx.create(), app);

    return new Promise<void>((resolve: any) => {
      this.server = app.listen(env.wwwPort, () => {
        const ctx = this.parentCtx.create();
        const host = this.server.address().address;
        const port = this.server.address().port;

        logger.info(
          ctx, util.format('Express listening at http://%s:%s', host, port));
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    this.parentCtx.info('stopping web');
    await this.server.close();
  }
}
