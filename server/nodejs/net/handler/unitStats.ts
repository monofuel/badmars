
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import MonoContext from '../../util/monoContext';
import Client from '../client';

export default async function getUnitStats(ctx: MonoContext, client: Client): Promise<void> {
	const units = await ctx.db.unitStats[client.planet.name].getAll(ctx);
	client.send('unitStats', { units });

	// TODO redo this for DB stuff
	/*
	if(!client.unitStatWatcher) {
		client.unitStatWatcher = fs.watchFile(UNIT_STAT_FILE, async() => {
			logger.info('units.json updated, reloading');
			const statsFile = fs.readFileSync(UNIT_STAT_FILE).toString();

			console.log('pushing unit updates to player');
			unitStats = JSON.parse(statsFile);
			client.send('unitStats', { units: unitStats });
		});
	} */
}