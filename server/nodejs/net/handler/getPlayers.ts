
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import Context from '../../context';
import db from '../../db';
import Client from '../client';
import User from '../../user';
import { sanitizeUser } from '../../util/socketFilter';

export default async function getPlayers(
  ctx: Context, client: Client): Promise<void> {
  const users = await db.user.list(ctx);
  await client.send('players', { players: users.map(sanitizeUser) });
}
