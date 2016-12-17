/* @flow */

//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use struct';

import _ from 'lodash';
import r from 'rethinkdb';

import db from './db';
import env from '../config/env';
import logger from '../util/logger';

import UnitStat from '../unit/unitStat';

export default class DBUnitStat {
  conn: r.Connection;
  mapName: string;
  tableName: string;
  table: r.Table;

  constructor(connection: r.Connection, mapName: string) {
    this.conn = connection;
    this.mapName = mapName;
    this.tableName = this.mapName + "_unitStats";
  }

  init(): Promise<void> {
    const self = this;

    return r.tableList().run(self.conn)
      .then((tableList: Array<string>) => {
        if (tableList.indexOf(self.tableName) === -1) {
          console.log('creating unit table for ' + self.mapName);
          return self.createTable();
        } else {
          // if we ever change indexes, add code to change them
        }
      })
      .then(() => {
        self.table = r.table(self.tableName);
      });
  }

  createTable(): Promise<void> {
    const self = this;
    return r.tableCreate(self.tableName,{
      primaryKey: 'type'
    }).run(self.conn)
    // no indexes for this tables
  }

  async getAll() {
    let profile = logger.startProfile('listUnitStats');
    return this.table.coerceTo('array').run(this.conn).then((array: Array<string>) => {
      logger.endProfile(profile);
      return array;
    })
  }

  async get(type: string) {
    let profile = logger.startProfile('getUnitStat')
    let doc = await this.table.get(type).run(this.conn);
    if (!doc) {
      throw new Error('unit stat not found for type: ',type);
    }
    logger.endProfile(profile);
    return this.load(doc);
  }

  async put(stat: UnitStat) {
    let profile = logger.startProfile('saveUnitStat');
		let result = await this.table.get(stat.type).update(stat).run(this.conn);
		logger.endProfile(profile);
		return result;
  }

  async load(doc: r.Document) {
    const stat = new UnitStat();
    stat.clone(doc);
    return stat;
  }

}
