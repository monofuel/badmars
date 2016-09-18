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
import {Chunk} from '../map/chunk.js';

exports.init = async () => {
  console.log('-------------------------------');
  console.log('starting validation');
  console.log('-------------------------------');

  await validateUnits();
  await validateChunks();
  //TODO validate maps

  console.log('-------------------------------');
  console.log('happy results');
  console.log('-------------------------------');
  process.exit();
}

async function validateUnits() {
  console.log('validating units');
  let counter = 0;
  //TODO should rename listUnits to just list (and friends)
  const unitList = await db.units['testmap'].listUnits();
  for (const unitDoc of unitList) {
    counter++;
    const unit = new Unit();
    unit.clone(unitDoc);
    await unit.validate();
  }
  console.log('units validated: ',counter);
}

async function validateChunks() {
  console.log('validating chunks');
  let counter = 0;
  const chunkList = await db.chunks['testmap'].list();
  for (const chunkDoc of chunkList) {
    counter++;
    const chunk = new Chunk();
    chunk.clone(chunkDoc);
    await chunk.validate();
  };
  console.log('chunks validated: ',counter);
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
