import * as DB from '../';
import Context from '../../context';
import { SyncEvent } from 'ts-events';
import GameUser from '../../user/user';

export default class User implements DB.User {
    watch(ctx: Context, fn: DB.Handler<GameUser>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    private userEvents: SyncEvent<GameUser>
    public async init(ctx: Context): Promise<void> {
        ctx.check('game.init');
        this.userEvents = new SyncEvent<GameUser>();
    }

    public async list(ctx: Context): Promise<GameUser[]> {
        throw new Error("Method not implemented.");
    }
    public async get(ctx: Context, uuid: string): Promise<GameUser> {
        throw new Error("Method not implemented.");
    }
    public async getByName(ctx: Context, name: string): Promise<GameUser> {
        throw new Error("Method not implemented.");
    }
    public async create(ctx: Context, user: GameUser): Promise<GameUser> {
        throw new Error("Method not implemented.");
    }
    public async patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser> {
        throw new Error("Method not implemented.");
    }
    public async delete(ctx: Context, uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
}