import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import { createTable } from '../helper';
import logger, { WrappedError } from '../../logger';
import { rethinkEach } from '.';

export default class Event implements DB.Event {
  public conn!: r.Connection;
  public table!: r.Table;
  public async init(ctx: Context, conn: r.Connection): Promise<void> {
    this.conn = conn;
    this.table = r.table('event');
  }
  public async setupSchema(ctx: Context, conn: r.Connection): Promise<void> {
    this.table = await createTable(conn, 'event');
  }

  public async watch(ctx: Context, fn: DB.Handler<DB.GameEvent>): Promise<void> {
    this.table.changes().run(this.conn).then((cursor: any) => {
      return rethinkEach(cursor, ctx, fn);
    }).catch((err) => {
      logger.trackError(ctx, new WrappedError(err, 'watching events'));
    });
  }
  public async sendChat(ctx: Context, user: string, text: string, channel: string): Promise<void> {
    throw new Error('not implemented');
  }
}
