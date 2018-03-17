import * as DB from '../../db';
import { assert } from 'chai';
import Context from '../../context';

import GameUser from '../../user';

export default class User implements DB.User {
  private db1: DB.User;
  private db2: DB.User;
  constructor(db1: DB.User, db2: DB.User) {
    this.db1 = db1;
    this.db2 = db2;
  }
  public async list(ctx: Context): Promise<GameUser[]> {
    const list1 = await this.db1.list(ctx);
    const list2 = await this.db2.list(ctx);
    assert.deepEqual(list1, list2);
    return list1;
  }

  public async get(ctx: Context, uuid: string): Promise<GameUser> {
    const user1 = await this.db1.get(ctx, uuid);
    const user2 = await this.db1.get(ctx, uuid);
    assert.deepEqual(user1, user2);
    return user1;
  }
  public async getByName(ctx: Context, name: string): Promise<GameUser | null> {
    const user1 = await this.db1.getByName(ctx, name);
    const user2 = await this.db1.getByName(ctx, name);
    assert.deepEqual(user1, user2);
    return user1;
  }
  public async create(ctx: Context, user: GameUser): Promise<GameUser> {
    const user1 = await this.db1.create(ctx, user);
    const user2 = await this.db2.create(ctx, user);
    assert.deepEqual(user1, user2);
    return user1;
  }
  public async patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser> {
    const user1 = await this.db1.patch(ctx, uuid, user);
    const user2 = await this.db2.patch(ctx, uuid, user);
    assert.deepEqual(user1, user2);
    return user1;
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    await this.db1.delete(ctx, uuid);
    await this.db2.delete(ctx, uuid);
  }

  public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUser>>): Promise<void> {
    // TODO this only attaches a watcher to db1
    // not sure about a nice way to check that 2 databases implement watching properly
    await this.db1.watch(ctx, fn);
  }
}
