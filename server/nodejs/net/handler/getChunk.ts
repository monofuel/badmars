
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import { sanitizeChunk, sanitizeUnit } from '../../util/socketFilter';
import Context from '../../context';
import Client from '../client';
import db from '../../db';
import { listChunkUnits } from '../../map/chunk';
import { isUnitVisible } from '../../unit/unit';
import * as _ from 'lodash';

export default async function getChunk(
  ctx: Context, client: Client, data: any): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, client.map.name);
  ctx.check('getChunk');
  const x = data.x || 0;
  const y = data.y || 0;

  const unitsOnly = data.unitsOnly;

  const chunk: Chunk = await client.planet.getChunkOld(ctx, x, y);
  if (!unitsOnly) {
    // ctx.logger.info(ctx, 'client getChunk', { x, y });
    await client.send('chunk', { chunk: sanitizeChunk(chunk) });
  }

  const units = await listChunkUnits(ctx, chunk);
  if (units.length > 0) {
    const sanitized: any[] = [];
    for (const unit of units) {
      if (!unit) {
        continue;
      }
      const visible = await isUnitVisible(ctx, unit, client.user);
      if (!visible) {
        return;
      }
      client.visibleUnits[unit.uuid] = unit;

      sanitized.push({ ...sanitizeUnit(unit, client.user.uuid), visible });
    }
    // TODO sanitize unit data
    await client.send('units', { units: sanitized });
    client.loadedChunks.push(`${x}:${y}`);
    while (client.loadedChunks.length > 60) {
      client.loadedChunks.shift();
    }
  }
}
