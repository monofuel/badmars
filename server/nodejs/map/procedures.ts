const Alea = require('alea');
import Context from '../context';
const SimplexNoise = require('simplex-noise');
import logger, { DetailedError } from '../logger';
import { LAND, CLIFF, WATER, COAST } from './tiletypes';
import { newChunk } from './chunk';
import ChunkLayer, { newChunkLayer } from './chunkLayer';
import { newUnit } from '../unit/unit';
import Map from '../map/map';
import { endProfile, startProfile } from '../util/stats';

export async function generateChunk(ctx: Context, map: Map, x: number, y: number):
  Promise<{ chunk: Chunk, chunkLayer: ChunkLayer }> {
  const prof = startProfile('generateChunk');
  const chunk = await newChunk(ctx, map.name, x, y);
  const layer = await newChunkLayer(ctx, map.name, x, y);
  ctx.check('generate');

  const waterFudge = 0.15;
  const smoothness = 4.5;

  const bigNoiseGenerator = new SimplexNoise(new Alea(map.seed));
  const medNoiseGenerator = new SimplexNoise(new Alea(map.seed * 79)); // random prime provided by brian
  const smallNoiseGenerator = new SimplexNoise(new Alea(map.seed * 13)); // random prime provided by kir
  chunk.chunkSize = map.settings.chunkSize;
  for (let i = 0; i < chunk.chunkSize + 1; i++) {
    chunk.grid.push([]);
    const x = (chunk.x * chunk.chunkSize) + i;
    for (let j = 0; j < chunk.chunkSize + 1; j++) {
      ctx.check('generating chunk tiles');
      const y = (chunk.y * chunk.chunkSize) + j;
      // dear god sorry chunk is so ugly
      // just porting over the same logic from the last generator that was on the client.
      let height = bigNoiseGenerator.noise2D(x * map.settings.bigNoise,
        y * map.settings.bigNoise) * map.settings.bigNoiseScale;
      height = height + medNoiseGenerator.noise2D(x * map.settings.medNoise,
        y * map.settings.medNoise) * map.settings.medNoiseScale;
      height = height + smallNoiseGenerator.noise2D(x * map.settings.smallNoise,
        y * map.settings.smallNoise) * map.settings.smallNoiseScale;

      // fudge land near the water height to look butter
      if (height - map.settings.waterHeight > -waterFudge && height - map.settings.waterHeight < waterFudge) {
        height = map.settings.waterHeight + waterFudge;
      }

      // @grid[x][y] = Math.round(point * smoothness) / smoothness
      chunk.grid[i].push(Math.round(height * smoothness) / smoothness);
    }
  }

  // -------------------------------------------------
  // figure out the type of each tile

  for (let i = 0; i < chunk.chunkSize; i++) {
    chunk.navGrid.push([]);
    for (let j = 0; j < chunk.chunkSize; j++) {
      ctx.check('generating chunk types');
      const corners = [
        chunk.grid[i][j],
        chunk.grid[i + 1][j],
        chunk.grid[i][j + 1],
        chunk.grid[i + 1][j + 1],
      ];

      let underwater = 0;
      const avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;

      let type = LAND;
      for (const k of corners) {
        if (Math.abs(k - avg) > map.settings.cliffDelta) {
          type = CLIFF;
          break;
        } else if (k < map.settings.waterHeight) {
          underwater++;
        }
      }
      if (underwater === 4) {
        type = WATER;
      } else if (underwater > 0) {
        type = COAST;
      }

      chunk.navGrid[i].push(type);
    }
  }
  endProfile(prof);
  return {
    chunk,
    chunkLayer: layer,
  };
}

export async function generateResources(ctx: Context, map: Map, chunk: Chunk, layer: ChunkLayer): Promise<void> {

  ctx.check('generateResources');
  const resourceAlea = new Alea(map.seed * chunk.x * chunk.y);
  for (let i = 0; i < chunk.chunkSize; i++) {
    const x = (chunk.x * chunk.chunkSize) + i;
    for (let j = 0; j < chunk.chunkSize; j++) {
      ctx.check('generating chunk resources');
      const y = (chunk.y * chunk.chunkSize) + j;

      if (chunk.navGrid[i][j] !== LAND) {
        continue;
      }

      if (resourceAlea() < map.settings.ironChance) {
        // console.log('spawning iron');
        let unit: Unit = await newUnit(ctx, 'iron', null, map.name, x, y);
        unit = await map.spawnUnitWithoutTileCheck(ctx, unit);
        if (!unit) {
          logger.info(ctx, 'failed to spawn iron');
        }

      } else if (resourceAlea() < map.settings.oilChance) {
        // console.log('spawning oil');
        let unit: Unit = await newUnit(ctx, 'oil', null, map.name, x, y);
        unit = await map.spawnUnitWithoutTileCheck(ctx, unit);
        if (!unit) {
          logger.info(ctx, 'failed to spawn oil');
        }
      }
    }
  }
}
