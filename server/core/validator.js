//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const _ = require('lodash');
const db = require('../db/db.js');
const env = require('../config/env.js');
const logger = require('../util/logger.js');
const Unit = require('../unit/unit.js');

exports.init = async () => {
  await checkUnitLocations();
  await validateUnits();

  console.log('happy results');
  process.exit();
}

async function validateUnits() {
  const unitList = await db.units['testmap'].listUnits();
  for (const unitDoc of unitList) {
    const unit = new Unit();
    unit.clone(unitDoc);
    await unit.validate();
  }
}


async function checkUnitLocations() {
  const unitList = await db.units['testmap'].listUnits();
  const tileMap = {};
  for (let unit of unitList) {
    if (!unit.tileHash) {
      throw new Error('unit missing tile: ' + unit.uuid);
    }
    if (unit.type === 'iron' || unit.type === 'oil') {
      continue;
    }
    for (let tileHash of unit.tileHash) {
      if (tileMap[tileHash]) {
        throw new Error('conflicting tile location:' + tileHash);
      }
      tileMap[tileHash] = unit.uuid;
    }
  }
  const chunkTileMap = {};
  const chunks = await db.chunks['testmap'].listChunks();
  for (let chunk of chunks) {
    _.each(chunk.units,(uuid,tileHash) => {
      if (chunkTileMap[tileHash]) {
        console.log('chunk',chunk.hash);
        throw new Error('conflicting chunk tile location:' + tileHash);
      }
      chunkTileMap[tileHash] = uuid;
    });
  }
  /*
  const chunkTileUuids = _.map(chunkTileMap);
  const unitTileUuids = _.map(tileMap);
  if (chunkTileUuids.length != unitTileUuids.length) {
    console.log(_.union(_.difference(unitTileUuids,chunkTileUuids)));
    throw new Error('chunk unit lists are missing units');
  }*/

}
