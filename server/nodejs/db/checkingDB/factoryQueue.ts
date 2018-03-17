import { assert } from 'chai';
import * as DB from '../../db';
import Context from '../../context';

export default class FactoryQueue implements DB.FactoryQueue {

  private db1: DB.FactoryQueue;
  private db2: DB.FactoryQueue;
  constructor(db1: DB.FactoryQueue, db2: DB.FactoryQueue) {
    this.db1 = db1;
    this.db2 = db2;
  }

  public async create(ctx: Context, order: FactoryOrder): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public async list(ctx: Context, factory: string): Promise<FactoryOrder[]> {
    throw new Error('Method not implemented.');
  }
  public async pop(ctx: Context, factory: string): Promise<FactoryOrder | null> {
    throw new Error('Method not implemented.');
  }
  public async peek(ctx: Context, factory: string): Promise<FactoryOrder | null> {
    throw new Error('Method not implemented.');
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

}
