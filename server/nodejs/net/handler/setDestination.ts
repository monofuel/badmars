
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import { WrappedError } from '../../logger';
import Context from '../../context';
import Client from '../client';
import db from '../../db';
import logger from '../../logger';
import { setUnitDestination, clearPath } from '../../unit/unit';

export default async function setDestination(
  ctx: Context, client: Client, data: any): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, client.map.name);

  ctx.check('setDestination');
  if (!data.unitId) {
    return client.sendError(ctx, 'setDestination', 'no unit specified');
  }
  if (!data.location || data.location.length !== 2) {
    return client.sendError(
      ctx, 'setDestination', 'no or invalid location set');
  }
  const x = Number(data.location[0]);
  const y = Number(data.location[1]);

  const unit: Unit = await planetDB.unit.get(ctx, data.unitId);
  if (unit.details.owner !== client.user.uuid) {
    return client.sendError(ctx, 'setDestination', 'not your unit');
  }

  try {
    await setUnitDestination(ctx, unit, x, y);
    // clear the current path so the pathfinder will run
    await clearPath(ctx, unit);
    await client.send('setDestination');
  } catch (err) {
    logger.trackError(ctx, new WrappedError(err, 'failed to set destination'));
    client.sendError(ctx, 'setDestination', 'failed to set destination');
  }
}
