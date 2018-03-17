import * as r from 'rethinkdb';
import * as DB from '../../db';
import * as uuidv4 from 'uuid/v4';
import Context from '../../context';
import GameUser from '../../user';
import GameSession from '../../user/session';
import { createTable } from '../helper';

export default class Session implements DB.Session {
  public conn: r.Connection;
  public table: r.Table;
  public async init(ctx: Context, conn: r.Connection): Promise<void> {
    this.conn = conn;
    this.table = r.table('session');
  }
  public async setupSchema(ctx: Context, conn: r.Connection): Promise<void> {
    this.table = await createTable(conn, 'session', 'token');
  }

  public async createBearer(ctx: Context, uuid: string): Promise<GameSession> {
    const sess: GameSession = {
      user: uuid,
      token: uuidv4(),
      type: 1,
    };
    await this.table.insert(sess).run(this.conn);

    return sess;
  }
  public async getBearerUser(ctx: Context, token: string): Promise<GameUser> {
    const c = await this.table.get(token).run(this.conn);
    return c as any;
  }
}
