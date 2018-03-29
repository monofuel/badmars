import * as _ from 'lodash';
import * as DB from '../../db';
import Context from '../../context';
import { expectEqual } from '../../util';

export default class DBUnit implements DB.DBUnit {

  private db1: DB.DBUnit;
  private db2: DB.DBUnit;
  constructor(db1: DB.DBUnit, db2: DB.DBUnit) {
    this.db1 = db1;
    this.db2 = db2;
  }
  public async listPlayersUnits(ctx: Context, uuid: string): Promise<Unit[]> {
    const units1 = await this.db1.listPlayersUnits(ctx, uuid);
    const units2 = await this.db2.listPlayersUnits(ctx, uuid);
    expectEqual(units1, units2);
    return units1;
  }
  public async each(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
    await this.db1.each(ctx, async (ctx: Context, unit1: Unit) => {
      const unit2 = await this.db2.get(ctx, unit1.uuid);
      expectEqual(unit1, unit2);
      await fn(ctx, unit1);
    });
  }
  public async get(ctx: Context, uuid: string): Promise<Unit> {
    const unit1 = await this.db1.get(ctx, uuid);
    const unit2 = await this.db2.get(ctx, uuid);
    expectEqual(unit1, unit2);
    return unit1;
  }
  public async create(ctx: Context, unit: Unit): Promise<Unit> {
    const unit1 = await this.db1.create(ctx, unit);
    const unit2 = await this.db2.create(ctx, _.cloneDeep(unit));
    expectEqual(unit1, unit2);
    return unit1;
  }
  public async getBulk(ctx: Context, uuids: UUID[]): Promise<{ [key: string]: Unit }> {
    const unitMap1 = await this.db1.getBulk(ctx, uuids);
    const unitMap2 = await this.db2.getBulk(ctx, uuids);
    expectEqual(unitMap1, unitMap2);
    return unitMap1;
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    await this.db1.delete(ctx, uuid);
    await this.db2.delete(ctx, uuid);
  }
  public async patch(ctx: Context, uuid: string, unit: Partial<UnitPatch>): Promise<Unit> {
    const unit1 = await this.db1.patch(ctx, uuid, unit);
    const unit2 = await this.db2.patch(ctx, uuid, unit);
    expectEqual(unit1, unit2);
    return unit1;
  }
  public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<Unit>>): Promise<void> {
    // TODO
    await this.db1.watch(ctx, fn);
  }
  public async watchPathing(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
    // TODO
    await this.db1.watchPathing(ctx, fn);
  }
  public getAtChunk(ctx: Context, hash: string): Promise<Unit[]> {
    throw new Error('Method not implemented.');
  }
  public async getUnprocessedPath(ctx: Context): Promise<Unit | null> {
    const unit1 = await this.db1.getUnprocessedPath(ctx);
    const unit2 = await this.db2.getUnprocessedPath(ctx);
    expectEqual(unit1, unit2);
    return unit1;
  }
  public async getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
    const list1 = await this.db1.getUnprocessedUnitUUIDs(ctx, tick);
    const list2 = await this.db2.getUnprocessedUnitUUIDs(ctx, tick);
    list1.sort();
    list2.sort();
    expectEqual(list1, list2);
    return list1;
  }
  public async claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit | null> {
    const unit1 = await this.db1.claimUnitTick(ctx, uuid, tick);
    const unit2 = await this.db2.claimUnitTick(ctx, uuid, tick);
    expectEqual(unit1, unit2);
    return unit1;
  }
  public async pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
    const pulled1 = await this.db1.pullResource(ctx, type, amount, uuid);
    const pulled2 = await this.db2.pullResource(ctx, type, amount, uuid);
    expectEqual(pulled1, pulled2);
    return pulled1;
  }
  public async putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
    const put1 = await this.db1.putResource(ctx, type, amount, uuid);
    const put2 = await this.db2.putResource(ctx, type, amount, uuid);
    expectEqual(put1, put2);
    return put1;
  }
  public async count(): Promise<number> {
    const count1 = await this.db1.count();
    const count2 = await this.db2.count();
    expectEqual(count1, count2);
    return count1;
  }
  public countAwake(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public countUnprocessed(): Promise<number> {
    throw new Error('Method not implemented.');
  }
}
