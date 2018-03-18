import { assert } from 'chai';
import * as DB from '../../db';
import Context from '../../context';

export default class Event implements DB.Event {
  private db1: DB.Event;
  private db2: DB.Event;
  constructor(db1: DB.Event, db2: DB.Event) {
    this.db1 = db1;
    this.db2 = db2;
  }
  public async sendChat(ctx: Context, user: string, text: string, channel: string): Promise<void> {
    await this.db1.sendChat(ctx, user, text, channel);
    await this.db2.sendChat(ctx, user, text, channel);
  }
  public async watch(ctx: Context, fn: DB.Handler<DB.ChatEvent>): Promise<void> {
    // TODO
    await this.db1.watch(ctx, fn);
  }
}
