/* tslint:disable */
// file is unused and functionality is being migrated to db/rethinkdb
import * as r from 'rethinkdb';
import db from '../db';
import Logger from '../logger';
import { DetailedError } from '../logger';
import Context from '../context';
import { createTable, createIndex, startDBCall } from './helper';
import User from '../user/user';
import Session from '../user/session';

export default class DBSession {
  conn: r.Connection;
  table: r.Table;
  tableName: string;

  constructor() { this.tableName = 'session'; }

  async init(conn: r.Connection): Promise<void> {
    this.conn = conn;
    this.table = r.table(this.tableName);
  }

  async setup(conn: r.Connection): Promise<void> {
    this.table = await createTable(conn, this.tableName, 'token');
    await createIndex(conn, this.table, 'user', true);
  }

  async getBearerUser(ctx: Context, token: string): Promise<User> {
    const call = await startDBCall(ctx, 'getBearerUser');
    const doc = await this.table.get(token).run(this.conn);
    if (!doc) {
      throw new DetailedError('session not found', { token });
    }
    const session = new Session();
    session.clone(doc);

    const user = await db.user.get(ctx, session.user);
    await call.end();
    return user;
  }
}
