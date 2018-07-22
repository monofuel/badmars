require('source-map-support').install();
import db from '../db/memoryDB';
import { setupDB } from '../db';
import Net from './net';
import Context from '../context';
import { prepareCtx } from '..';

describe('net', async () => {
  let net: Net;
  let ctx: Context;

  it('should setup db', async () => {
    setupDB(db);
    ctx = await prepareCtx('net', db);
  });

  it('should start net', async () => {
    net = new Net();
    await net.init(ctx);
    await net.start();
  });

  it('should stop net', async () => {
    await net.stop();
  });
});
