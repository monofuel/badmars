import { assert } from 'chai';
import * as DB from '../../db';
import Context from '../../context';
import GameSession from '../../user/session';
import GameUser from '../../user';

export default class Session implements DB.Session {
  private db1: DB.Session;
  private db2: DB.Session;
  constructor(db1: DB.Session, db2: DB.Session) {
    this.db1 = db1;
    this.db2 = db2;
  }
  public async createBearer(ctx: Context, uuid: UUID): Promise<GameSession> {
    throw new Error('Method not implemented.');
  }
  public async getBearerUser(ctx: Context, token: string): Promise<GameUser | null> {
    throw new Error('Method not implemented.');
  }
}
