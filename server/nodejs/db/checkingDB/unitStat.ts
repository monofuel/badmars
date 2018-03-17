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
    throw new Error('Method not implemented.');
  }
  public async get(ctx: Context, type: string): Promise<GameUnitStat> {
    throw new Error('Method not implemented.');
  }
  public async patch(ctx: Context, type: string, stats: Partial<GameUnitStat>): Promise<GameUnitStat> {
    throw new Error('Method not implemented.');
  }

}
