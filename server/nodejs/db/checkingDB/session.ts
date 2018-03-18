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
  public async createBearer(ctx: Context, uuid: UUID, token: string): Promise<GameSession> {
    const session1 = await this.db1.createBearer(ctx, uuid, token);
    const session2 = await this.db2.createBearer(ctx, uuid, token);
    assert.deepEqual(session1, session2);
    return session1;
  }
  public async getBearerUser(ctx: Context, token: string): Promise<GameUser | null> {
    const user1 = await this.db1.getBearerUser(ctx, token);
    const user2 = await this.db2.getBearerUser(ctx, token);
    assert.deepEqual(user1, user2);
    return user1;
  }
}
