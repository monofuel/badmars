
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import { Service } from './';
import Context from '../context';
import db from '../db';
import * as DB from '../db';
import logger from '../logger';

let maps = [];

export default class ValidatorService implements Service {
  private parentCtx!: Context;

  public async init(ctx: Context): Promise<void> { this.parentCtx = ctx; }

  public async start(): Promise<void> {
    const ctx = this.parentCtx.create();
    if (process.argv.length > 2) {
      maps = process.argv.slice(2, process.argv.length);
    } else {
      maps = await db.listPlanetNames(ctx);
    }

    for (const mapName of maps) {
      const planetDB = await db.getPlanetDB(ctx, mapName);
      await this.validateUnits(ctx, planetDB);
      await this.validateChunks(ctx, planetDB);
      // TODO validate maps
    }

    process.exit();
  }

  public async stop(): Promise<void> {
    this.parentCtx.info('stopping validator');
    throw new Error('not implemented');
  }

  private async validateUnits(ctx: Context, planetDB: DB.Planet): Promise<void> {
    let counter = 0;

    await planetDB.unit.each(ctx, async (ctx: Context, unit: Unit) => {
      counter++;
      // await unit.validate(ctx);
    });
    logger.info(ctx, 'units validated: ', { counter });
  }

  private async validateChunks(ctx: Context, planetDB: DB.Planet): Promise<void> {
    let counter = 0;
    await planetDB.chunk.each(ctx, async (ctx: Context, chunk: Chunk) => {
      counter++;
      // await chunk.validate(ctx);
    });
    logger.info(ctx, 'chunks validated: ', { counter });
  }

  /*async function checkUnitLocations(mapName: string) {
          const unitList = await db.units[mapName].listUnits();
          const tileMap = {};
          for(const unit of unitList) {
                  if(!unit.tileHash) {
                          throw new Error('unit missing tile: ' + unit.uuid);
                  }
                  if(unit.type === 'iron' || unit.type === 'oil') {
                          continue;
                  }
                  for(const tileHash of unit.tileHash) {
                          if(tileMap[tileHash]) {
                                  throw new Error('conflicting tile location:' +
     tileHash);
                          }
                          tileMap[tileHash] = unit.uuid;
                  }
          }
          const chunkTileMap = {};
          const chunks = await db.chunks[mapName].listChunks();
          for(const chunk of chunks) {
                  _.each(chunk.units, (uuid, tileHash) => {
                          if(chunkTileMap[tileHash]) {
                                  console.log('chunk', chunk.hash);
                                  throw new Error('conflicting chunk tile
     location:' + tileHash);
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

  // }
}
