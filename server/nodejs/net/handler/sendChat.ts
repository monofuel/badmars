
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import Context from '../../context';
import User from '../../user';
import Client from '../client';
import db from '../../db';
const DEFAULT_CHANNEL = 'global';

export default async function sendChat(
  ctx: Context, client: Client, data: any): Promise<void> {

  const user: User = client.user;
  if (!data.text) {
    await client.sendError(ctx, 'sendChat', 'no text set');
    return;
  }

  await db.event.sendChat(
    ctx, user.uuid, data.text, data.channel || DEFAULT_CHANNEL);
}
