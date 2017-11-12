
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../../context';
import Client from '../client';
import Unit from '../../unit/unit';
import db from '../../db';

export default async function getUnits(ctx: Context, client: Client): Promise<void> {
	const planetDB = await db.getPlanetDB(ctx, this.location.map);
	const units: Array<Unit> = await planetDB.unit.listPlayersUnits(ctx, client.user.uuid);
	client.send('units', { units: units });
}
