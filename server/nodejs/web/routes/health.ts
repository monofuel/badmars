
// -----------------------------------
//  author: Monofuel
//  website: badmars.net
//  Licensed under included modified BSD license

import * as express from 'express';
import Context from '../../context';

export default function route(ctx: Context, app: express.Application) {
  app.get('/_health', (req: express.Request, res: express.Response) => {
    // ctx.logger.info(ctx, 'GET /_health', {}, { req });
    res.send('OK');
  });
}
