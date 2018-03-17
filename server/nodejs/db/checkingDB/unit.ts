import * as DB from '../../db';
import { assert } from 'chai';
import Context from '../../context';

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
    assert.deepEqual(units1, units2);
    return units1;
  }
  public async each(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
    await this.db1.each(ctx, async (ctx: Context, unit1: Unit) => {
      const unit2 = await this.db2.get(ctx, unit1.uuid);
      assert.deepEqual(unit1, unit2);
      await fn(ctx, unit1);
    });
  }
  public async get(ctx: Context, uuid: string): Promise<Unit> {
    const unit1 = await this.db1.get(ctx, uuid);
    const unit2 = await this.db2.get(ctx, uuid);
    assert.deepEqual(unit1, unit2);
    return unit1;
  }
  public async create(ctx: Context, unit: Unit): Promise<Unit> {
    const unit1 = await this.db1.create(ctx, unit);
    const unit2 = await this.db2.create(ctx, unit);
    assert.deepEqual(unit1, unit2);
    return unit1;
  }
  public async getBulk(ctx: Context, uuids: UUID[]): Promise<{ [key: string]: Unit }> {
    const unitMap1 = await this.db1.getBulk(ctx, uuids);
    const unitMap2 = await this.db2.getBulk(ctx, uuids);
    assert.deepEqual(unitMap1, unitMap2);
    return unitMap1;
  }
  public async delete(ctx: Context, uuid: string): Promise<void> {
    await this.db1.delete(ctx, uuid);
    await this.db2.delete(ctx, uuid);
  }
  public async patch(ctx: Context, uuid: string, unit: Partial<UnitPatch>): Promise<Unit> {
    throw new Error('Method not implemented.');
  }
  public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<Unit>>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public async watchPathing(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public getAtChunk(ctx: Context, hash: string): Promise<Unit[]> {
    throw new Error('Method not implemented.');
  }
  public async getUnprocessedPath(ctx: Context): Promise<Unit> {
    throw new Error('Method not implemented.');
  }
  public async getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  public async claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit | null> {
    throw new Error('Method not implemented.');
  }
  public async pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public async putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public async count(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public countAwake(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public countUnprocessed(): Promise<number> {
    throw new Error('Method not implemented.');
  }
}
