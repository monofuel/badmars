import db, * as DB from '../../db';
import Context from '../../context';
import GameUser from '../../user';
import GameSession from '../../user/session';
import { startDBCall } from '../helper';

export default class Session implements DB.Session {

  public sessions: { [key: string]: GameSession } = {};

  public async init(ctx: Context): Promise<void> {
    ctx.check('session.init');
  }

  public async createBearer(ctx: Context, uuid: UUID, token: string): Promise<GameSession> {
    const call = startDBCall(ctx, 'event.createBearer');
    const sess: GameSession = {
      user: uuid,
      token,
      type: 1,
    };
    this.sessions[sess.token] = sess;
    await call.end();
    return sess;
  }

  public async getBearerUser(ctx: Context, token: string): Promise<GameUser | null> {
    const call = startDBCall(ctx, 'session.getBearerUser');
    const sess = this.sessions[token];
    if (!sess) {
      return null;
    }
    await call.end();
    return await db.user.get(ctx, sess.user);
  }
}
