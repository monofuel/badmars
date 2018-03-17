
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import * as express from 'express';
import { exec } from 'child_process';

import logger, { WrappedError } from '../../logger';
import Context from '../../context';

export default function route(ctx: Context, app: express.Application) {
  app.get('/management/pull', (req: express.Request, res: express.Response) => {
    logger.info(ctx, 'GET /management/pull', {}, { req });
    exec('sh update.sh', (err: Error | null) => {
      if (err) {
        logger.trackError(ctx, new WrappedError(err, 'running update script'));
      }
    });
    res.json(JSON.stringify({ success: true }));
  });
}
