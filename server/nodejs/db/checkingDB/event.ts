import { assert } from 'chai';
import * as DB from '../../db';
import Context from '../../context';

export default class Event implements DB.Event {

  public sendChat(ctx: Context, user: string, text: string, channel: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public watch(ctx: Context, fn: DB.Handler<DB.ChatEvent>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  private db1: DB.Event;
  private db2: DB.Event;
  constructor(db1: DB.Event, db2: DB.Event) {
    this.db1 = db1;
    this.db2 = db2;
  }

}
