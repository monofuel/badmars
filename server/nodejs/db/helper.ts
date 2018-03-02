/* tslint:disable */
// file is unused and functionality is being migrated to db/rethinkdb

import * as r from 'rethinkdb';
import * as _ from 'lodash';

import Context from '../context';
import logger from '../logger';

import DBChunk from './chunk';
import DBUnit from './unit';
import DBUnitStat from './unitStat';

type ProfileKey = string;

class DBCall {
  public profile: ProfileKey;
  public name: string;
  public ctx: Context;
  constructor(ctx: Context, name: string) {
    this.ctx = ctx;
    this.name = name;
    this.profile = logger.startProfile(this.name);
    ctx.check(this.name);
  }
  public async check(): Promise<void> { this.ctx.check(this.name); }
  public async end(visible?: boolean): Promise<void> {
    logger.endProfile(this.profile, visible);
    this.ctx.check(this.name);
  }
}

export async function createTable(
  conn: r.Connection, tableName: string,
  primaryKey?: string): Promise<r.Table> {
  let results; if (primaryKey) {
    results =
      await (r as any)
        .tableList()
        .contains(tableName)
        .do((exists: boolean):
          any => {
          return r.branch(
            exists as any, { table_created: 0 } as any,
            (r as any).tableCreate(tableName, { primaryKey }));
        })
        .run(conn);
  } else {
    results = await (r as any)
      .tableList()
      .contains(tableName)
      .do((exists: boolean):
        any => {
        return r.branch(exists as any, {
          table_created: 0,
        } as any, (r as any).tableCreate(tableName));
      })
      .run(conn);
  } if (results.table_created) {
    logger.info(null, 'created table:' + tableName);
  } return r.table(tableName);
}

export async function createIndex(
  conn: r.Connection, table: r.Table, name: string, multi?: boolean):
  Promise<void> {
  const indexList: any = await table.indexList().run(conn); if (multi) {
    if (!indexList.includes(name)) {
      logger.info(null, 'adding ' + name + ' index');
      await table.indexCreate(name, { multi } as any).run(conn);
    }
  } else {
    if (!indexList.includes(name)) {
      logger.info(null, 'adding ' + name + ' index');
      await table.indexCreate(name).run(conn);
    }
  }
}

export async function clearSpareIndices(
  conn: r.Connection, table: r.Table,
  validIndices: string[]): Promise<void> {
  await (table as any).indexWait();
  const indexList: string[] = await table.indexList().run(conn);
  const spareIndices = _.remove(
    indexList, (e: string): boolean => !validIndices.includes(e));
  for (const index of spareIndices) { await table.indexDrop(index).run(conn); }
}

export function startDBCall(ctx: Context, name: string):
  DBCall {
  ctx.check(`startDBCall ${name}`); return new DBCall(ctx, name);
}

export async function setupPlanet(
  conn: r.Connection, name: string): Promise<any> {
  const chunk = new DBChunk(conn, name); const unit = new DBUnit(conn, name);
  const unitStats = new DBUnitStat(conn, name);
  return Promise.all([
    chunk.setup(),
    unit.setup(),
    unitStats.setup(),
  ]);
}
