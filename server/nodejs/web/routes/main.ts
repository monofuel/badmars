
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import * as express from 'express';
import Context from '../../context';
import logger from '../../logger';
import db from '../../db';

export default function route(ctx: Context, app: express.Application) {
  app.get('/', (req: express.Request, res: express.Response) => {
    logger.info(ctx, 'GET /', {}, { req });
    res.render('pages/index');
  });

  app.get('/login', (req: express.Request, res: express.Response) => {
    logger.info(ctx, 'GET /login', {}, { req });
    res.render('pages/index');
  });

  app.get('/badmars', (req: express.Request, res: express.Response) => {
    logger.info(ctx, 'GET /badmars', {}, { req });
    res.render('pages/badmars');
  });
  app.get('/test', async (req: express.Request, res: express.Response) => {
    ctx = ctx.create({ name: '/test' });
    const user = await db.user.getByName(ctx, 'test');
    if (!user) {
      res.status(400).send({ msg: 'missing test user' });
      return;
    }
    const sess = await db.session.createBearer(ctx, user.uuid);
    logger.info(ctx, 'GET /test', {}, { req });
    res.render('pages/test', { sessionToken: sess.token });
  });
}
