import db, * as DB from '../../db';
import Context from '../../context';
import GameUser from '../../user';
import GameSession from '../../user/session';
import { NotFoundError } from '../../logger';
import * as uuidv4 from 'uuid/v4';

export default class Session implements DB.Session {

    sessions: { [key: string]: GameSession } = {};

    public async init(ctx: Context): Promise<void> {
        ctx.check('session.init');
    }

    public async createBearer(ctx: Context, uuid: UUID): Promise<GameSession> {
        ctx.check('event.createBearer');
        const sess: GameSession = {
            user: uuid,
            token: uuidv4(),
            type: 1
        }
        this.sessions[sess.token] = sess;
        return sess;
    }

    public async getBearerUser(ctx: Context, token: string): Promise<GameUser> {
        ctx.check('session.getBearerUser');
        const sess = this.sessions[token];
        if (!sess) {
            throw new NotFoundError('session not found by token', { token });
        }
        return await db.user.get(ctx, sess.user);
    }
}