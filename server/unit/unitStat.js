/* @flow */

//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use struct';

import _ from 'lodash';
import fs from 'fs';

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';

export default class UnitStat {

  constructor() {

    this.validateSync();
  }

  validateSync(): boolean {
    let valid = true;
    if (!env.debug) {
      return valid;
    }

    return valid;
  }

  async validateAsync() {
    let valid = true;
    if (!env.debug) {
      return valid;
    }
    if (!this.validateSync())  {
      valid = false;
    }
    //do async validation work

    return Promise.resolve(valid);
  }

  clone(other: UnitStat) {
    for (let key in other) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(other[key]);
		}
  }

  //---------------
  // Static methods
  //---------------

  static getStat(type: string): UnitStat {
    //TODO
    return new UnitStat();
  }

  static init() {
    return loadDefaults();
  }
}

//load all default stats into database
async function loadDefaults() {
  const statsFile = fs.readFileSync('config/units.json').toString();
  const stats = JSON.parse(statsFile);

  //TODO dump into database
  console.log('====================');
  console.log('stats loaded');
  console.log('====================');
}
