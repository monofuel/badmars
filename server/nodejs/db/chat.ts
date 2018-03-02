/* tslint:disable */
// file is unused and functionality is being migrated to db/rethinkdb

import * as r from 'rethinkdb';
import { createTable } from './helper';
import logger from '../logger';
import User from '../user/user';

export default class DBChat {
  conn: r.Connection;
  table: r.Table;
  tableName: string;

  constructor() { this.tableName = 'chat'; }

  async init(conn: r.Connection): Promise<void> {
    this.conn = conn;
    this.table = r.table(this.tableName);
  }

  async setup(conn: r.Connection): Promise<void> {
    this.table = await createTable(conn, this.tableName);
  }

  async watchChat(func: Function): Promise<void> {
    this.table.changes().run(this.conn).then(
      (cursor: any) => { cursor.each(func); });
  }

  async sendChat(user: User, text: string, channel: string): Promise<void> {
    const object = { uuid: user.uuid, channel, text, timestamp: Date.now() };

    await this.table.insert(object).run(this.conn);
  }
}
