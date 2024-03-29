
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import Context from '../../context';
import Client from '../client';
import db from '../../db';
import { setTransferGoal } from '../../unit/unit';

export default async function transferResource(
  ctx: Context, client: Client, data: any): Promise<void> {
  const planetDB = await db.getPlanetDB(ctx, client.map.name);

  if (!data.source) {
    return client.sendError(ctx, 'transferResource', 'missing source');
  }
  if (!data.dest) {
    return client.sendError(ctx, 'transferResource', 'missing dest');
  }
  if (!data.iron && !data.fuel) {
    return client.sendError(
      ctx, 'transferResource', 'missing resource (iron and or fuel)');
  }

  const sourceUnit = await planetDB.unit.get(ctx, data.source);
  const destUnit = await planetDB.unit.get(ctx, data.dest);

  if (!sourceUnit || sourceUnit.details.owner !== client.user.uuid) {
    return client.sendError(
      ctx, 'transferResource', 'source unit is not yours');
  }
  if (!destUnit || destUnit.details.owner !== client.user.uuid) {
    return client.sendError(ctx, 'transferResource', 'dest unit is not yours');
  }

  await setTransferGoal(
    ctx, sourceUnit, destUnit.uuid, data.iron || 0, data.fuel || 0);

  await client.send('transferResource');

}
