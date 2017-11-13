import * as DB from '../../db';
import Context from '../../context';
import { SyncEvent } from 'ts-events';
import GameUser from '../../user';
import { NotFoundError } from '../../logger';


export default class User implements DB.User {

    private userChange: SyncEvent<DB.ChangeEvent<GameUser>>;
    private users: { [key: string]: GameUser } = {};

    public async init(ctx: Context): Promise<void> {
        ctx.check('user.init');
        this.userChange = new SyncEvent<DB.ChangeEvent<GameUser>>();
    }

    public async list(ctx: Context): Promise<GameUser[]> {
        ctx.check('user.list');
        return Object.values(this.users);
    }
    public async get(ctx: Context, uuid: string): Promise<GameUser> {
        ctx.check('user.get');
        const existing = this.users[uuid];
        if (!existing) {
            throw new NotFoundError('user not found by uuid', { uuid });
        }
        return existing;
    }
    public async getByName(ctx: Context, name: string): Promise<GameUser> {
        ctx.check('user.getByName');
        for (const uuid in this.users) {
            if (this.users[uuid].name === name) {
                return this.users[uuid];
            }
        }
        throw new NotFoundError('user not found by name', { name })
    }
    public async create(ctx: Context, user: GameUser): Promise<GameUser> {
        ctx.check('user.create');
        this.users[user.uuid] = user;
        this.userChange.post({ next: user });
        return user;
    }
    public async patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser> {
        const prev = this.users[uuid];
        if (!prev) {
            throw new NotFoundError('user not found for patch', { uuid });
        }
        const next = {
            ...prev,
            ...user
        }
        this.users[uuid] = next;
        this.userChange.post({ next, prev });
        return next;
    }
    public async delete(ctx: Context, uuid: string): Promise<void> {
        delete this.users[uuid];
    }
    public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUser>>): Promise<void> {
        ctx.check('event.watch');
        DB.AttachChangeHandler(ctx, this.userChange, fn);
    }
}