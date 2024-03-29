
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import Context from '../../context';
import db from '../../db';
import Client from '../client';

export default async function getUnitStats(
        ctx: Context, client: Client): Promise<void> {
        const planetDB = await db.getPlanetDB(ctx, client.map.name);

        const units = await planetDB.unitStat.getAll(ctx);
        await client.send('unitStats', { units });

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
