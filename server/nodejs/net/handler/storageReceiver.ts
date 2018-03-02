import Context from '../../context';
import Client from '../client';
import db from '../../db';
import logger, { WrappedError } from '../../logger';
import { setReceiver } from '../../unit/unit';

export default async function storageReceiver(ctx: Context, client: Client, data: any): Promise<void> {
    const planetDB = await db.getPlanetDB(ctx, client.map.name);
    if (!data.uuids || !Array.isArray(data.uuids)) {
        return client.sendError(ctx, 'storageReceiver', 'no uuids specified');
    }
    if (typeof data.receive !== 'boolean') {
        return client.sendError(ctx, 'storageReceiver', 'receive not specified');
    }
    const units = await planetDB.unit.getBulk(ctx, data.uuids);
    let count = 0;
    for (const uuid in units) {
        const unit = units[uuid];

        if (unit.details.type !== 'storage') {
            continue;
        }

        await setReceiver(ctx, unit, data.receive);

        count++;
    }
    await client.send('storageReceiver', { success: true, count });
}
