import * as _ from 'lodash';
import * as DB from '../../db';
import Context from '../../context';
import { SyncEvent } from 'ts-events';
import GameUser from '../../user';
import { startDBCall } from '../helper';

export default class User implements DB.User {

  private userChange: SyncEvent<DB.ChangeEvent<GameUser>>;
  private users: { [key: string]: GameUser } = {};

  constructor() {
    this.userChange = new SyncEvent<DB.ChangeEvent<GameUser>>();
  }

  public async init(ctx: Context): Promise<void> {
    ctx.check('user.init');
  }

  public async list(ctx: Context): Promise<GameUser[]> {
    const call = startDBCall(ctx, 'user.list');
    const list = Object.values(this.users);
    await call.end();
    return list;
  }
  public async get(ctx: Context, uuid: string): Promise<GameUser> {
    return this.users[uuid];
  }
  public async getByName(ctx: Context, name: string): Promise<GameUser | null> {
    const call = startDBCall(ctx, 'user.getByName');
    for (const uuid in this.users) {
      if (this.users[uuid].username === name) {
        await call.end();
        return this.users[uuid];
      }
    }
    await call.end();
    return null;
  }
  public async create(ctx: Context, user: GameUser): Promise<GameUser> {
    const call = startDBCall(ctx, 'user.create');
    this.users[user.uuid] = user;
    this.userChange.post({ next: user });
    await call.end();
    return user;
  }
  public async patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser> {
    const call = startDBCall(ctx, 'user.patch');
    const prev = this.users[uuid];
    const next = _.merge({}, prev, user);
    this.users[uuid] = next;
    this.userChange.post({ next, prev });
    await call.end();
    return next;
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    delete this.users[uuid];
  }
  public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUser>>): Promise<void> {
    DB.AttachChangeHandler(ctx, this.userChange, fn);
  }
}
