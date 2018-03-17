import { assert } from 'chai';
import * as DB from '../../db';
import Context from '../../context';
import GameUnitStat from '../../unit/unitStat';

export default class DBUnitStat implements DB.DBUnitStat {
  private db1: DB.DBUnitStat;
  private db2: DB.DBUnitStat;
  constructor(db1: DB.DBUnitStat, db2: DB.DBUnitStat) {
    this.db1 = db1;
    this.db2 = db2;
  }

  public async getAll(ctx: Context): Promise<{ [key: string]: GameUnitStat }> {
    const unitStats1 = await this.db1.getAll(ctx);
    const unitStats2 = await this.db1.getAll(ctx);
    assert.deepEqual(unitStats1, unitStats2);
    return unitStats1;
  }
  public async get(ctx: Context, type: string): Promise<GameUnitStat> {
    const unitStat1 = await this.db1.get(ctx, type);
    const unitStat2 = await this.db1.get(ctx, type);
    assert.deepEqual(unitStat1, unitStat2);
    return unitStat1;
  }
  public async patch(ctx: Context, type: string, stats: Partial<GameUnitStat>): Promise<GameUnitStat> {
    const unitStat1 = await this.db1.patch(ctx, type, stats);
    const unitStat2 = await this.db1.patch(ctx, type, stats);
    assert.deepEqual(unitStat1, unitStat2);
    return unitStat1;
  }

}
