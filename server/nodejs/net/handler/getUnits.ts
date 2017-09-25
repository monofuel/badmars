
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../../util/context';
import Client from '../client';
import Unit from '../../unit/unit';

export default async function getUnits(ctx: Context, client: Client): Promise<void> {
	const units: Array<Unit> = await ctx.db.units[client.planet.name].listPlayersUnits(ctx, client.user.uuid);
	client.send('units', { units: units });
}
