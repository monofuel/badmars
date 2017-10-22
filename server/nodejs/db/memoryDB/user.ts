import * as DB from '../';
import Context from '../../util/context';
import { SyncEvent } from 'ts-events';
import GameUser from '../../user/user';

export default class User implements DB.User {
    private userEvents: SyncEvent<GameUser>
    public async init(ctx: Context): Promise<void> {
        ctx.check('game.init');
        this.userEvents = new SyncEvent<GameUser>();
    }
}