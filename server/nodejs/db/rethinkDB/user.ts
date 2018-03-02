import * as r from 'rethinkdb';
import Context from '../../context';
import * as DB from '../../db';
import GameUser from '../../user';
import GameSession from '../../user/session';
import { createIndex, createTable, startDBCall } from '../helper';

export default class User implements DB.User {
  public conn: r.Connection;
  public table: r.Table;
  public async init(ctx: Context, conn: r.Connection): Promise<void> {
    this.conn = conn;
    this.table = r.table('user');
  }
  public async setupSchema(ctx: Context, conn: r.Connection): Promise<void> {
    this.table = await createTable(conn, 'user', 'uuid');
    await createIndex(conn, this.table, 'name');
    await createIndex(conn, this.table, 'email');
  }

  public list(ctx: Context): Promise<GameUser[]> {
    throw new Error('Method not implemented.');
  }
  public async get(ctx: Context, uuid: string): Promise<GameUser> {
    const call = await startDBCall(ctx, 'getUser');
    const c = await this.table.get(uuid).run(this.conn);
    await call.end();
    return c as any;
  }
  public async getByName(ctx: Context, name: string): Promise<GameUser> {
    const cursor = await this.table.getAll(name, {
      index: 'name',
    }).run(this.conn);
    const docs = await cursor.toArray();
    if (docs.length !== 1) {
      return null;
    }
    return docs[0];
  }
  public watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUser>>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public async create(ctx: Context, user: GameUser): Promise<GameUser> {
    const call = await startDBCall(ctx, 'createUesr');
    const result = await this.table.insert(user).run(this.conn);
    await call.end();
    return user; // doesn't change Unit
  }
  public patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser> {
    throw new Error('Method not implemented.');
  }
  public delete(ctx: Context, uuid: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
