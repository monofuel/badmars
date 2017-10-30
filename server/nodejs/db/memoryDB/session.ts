import * as DB from '../';
import Context from '../../util/context';
import GameUser from '../../user/user';
import GameSession from '../../user/session';

export default class Session implements DB.Session {
    public async init(ctx: Context): Promise<void> {

    }
    public createBearer(ctx: Context, uuid: string): Promise<GameSession> {
        throw new Error("Method not implemented.");
    }

    public async getBearerUser(ctx: Context, token: string): Promise<GameUser> {
        throw new Error("Method not implemented.");
    }
}