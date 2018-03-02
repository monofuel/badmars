import * as DB from '../';
import Context from '../../context';

export default class FactoryQueue implements DB.FactoryQueue {

  // all of the methods happen to be syncronous- if they were not, we should have a lock around this.
  private orders: { [key: string]: FactoryOrder[] } = {};

  public async init(ctx: Context): Promise<void> {
    ctx.check('factoryQueue.init');
  }
  public async create(ctx: Context, order: FactoryOrder): Promise<void> {
    if (!this.orders[order.factory]) {
      this.orders[order.factory] = [];
    }
    this.orders[order.factory].push(order);
  }
  public async list(ctx: Context, factory: string): Promise<FactoryOrder[]> {
    if (!this.orders[factory]) {
      this.orders[factory] = [];
    }
    return this.orders[factory];
  }

  public async pop(ctx: Context, factory: string): Promise<FactoryOrder | null> {
    if (!this.orders[factory]) {
      return null;
    }

    return this.orders[factory].pop();
  }
  public async peek(ctx: Context, factory: string): Promise<FactoryOrder | null> {
    if (!this.orders[factory]) {
      return null;
    }

    return this.orders[factory][0];
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    // HACK slow implementation, but this shouldn't be called that often.
    for (const factoryuuid in this.orders) {
      const factory = this.orders[factoryuuid];
      for (let i = 0; i < factory.length; i++) {
        const order = factory[i];
        if (order.uuid === uuid) {
          this.orders[factoryuuid] = factory.splice(i, 1);
          return;
        }
      }
    }
  }
}
