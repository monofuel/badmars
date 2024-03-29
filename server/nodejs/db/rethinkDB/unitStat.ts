import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import UnitStat from '../../unit/unitStat';
import { createTable } from '../helper';

export default class DBUnitStat implements DB.DBUnitStat {
  public conn!: r.Connection;
  public table!: r.Table;

  public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
    this.conn = conn;
    this.table = r.table(`${planetName}_unitStat`);
  }
  public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
    this.table = await createTable(conn, `${planetName}_unitStat`, 'hash');
  }

  public getAll(ctx: Context): Promise<{ [key: string]: UnitStat; }> {
    throw new Error('Method not implemented.');
  }
  public get(ctx: Context, type: string): Promise<UnitStat> {
    throw new Error('Method not implemented.');
  }
  public patch(ctx: Context, type: string, stats: Partial<UnitStat>): Promise<UnitStat> {
    throw new Error('Method not implemented.');
  }

}
