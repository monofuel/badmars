import db from '../../db';
import Context from '../../context';
import logger, { DetailedError } from '../../logger';
import * as _ from 'lodash';

import UnitAI from './';
import { unitDistance, sendResource } from '../unit';

const transferLimit = 5;

export default class TransferTowerAI implements UnitAI {
    async actionable(ctx: Context, unit: Unit): Promise<boolean> {
        if (unit.details.ghosting) {
            return false;
        }
        return unit.details.type === 'transfer_tower';
    }
    async simulate(ctx: Context, self: Unit): Promise<void> {
        ctx.check('transferTower simulate');
        const planetDB = await db.getPlanetDB(ctx, self.location.map);

        const units: Unit[] = await planetDB.planet.getNearbyUnitsFromChunkWithTileRange(ctx, self.location.chunkHash[0], self.storage.transferRange);
        const nearby = _.filter(units, (unit) => unitDistance(self, unit) < self.storage.transferRange);

        // push resources to receivers
        await this.handleReceivers(ctx, self, 'iron', nearby);
        await this.handleReceivers(ctx, self, 'fuel', nearby);

        // balance resources from storage
        await this.balanceStorages(ctx, self, 'iron', nearby);
        await this.balanceStorages(ctx, self, 'fuel', nearby);

        // push resources to other towers
        await this.pushTowers(ctx, self, 'iron', nearby);
        await this.pushTowers(ctx, self, 'fuel', nearby);
    }
    private async handleReceivers(ctx: Context, self: Unit, resourceType: Resource, nearby: Unit[]): Promise<void> {
        // find receiver storages that are not full
        const receivers: Unit[] = _.filter(nearby,
            (unit) => unit.details.type === 'storage' &&
                unit.storage.receive &&
                unit.storage[resourceType] < unit.storage[resourceType === 'iron' ? 'maxIron' : 'maxFuel']);
        let balanceResource = self.storage[resourceType] / receivers.length;
        if (balanceResource > transferLimit) balanceResource = 5;
        if (balanceResource < 1) {
            return;
        }
        for (const receiver of receivers) {
            await sendResource(ctx, resourceType, balanceResource, self, receiver);
        }
    }

    private async balanceStorages(ctx: Context, self: Unit, resourceType: Resource, nearby: Unit[]): Promise<void> {
        const max = resourceType === 'iron' ? 'maxIron' : 'maxFuel';
        // find nearby not-receiver storages
        const storages: Unit[] = _.filter(nearby,
            (unit) => unit.details.type === 'storage' &&
                !unit.storage.receive &&
                unit.storage[resourceType] < unit.storage[max]);
        for (const storage of storages) {
            const storagePercentage = storage.storage[resourceType] / storage.storage[max];
            const selfPercentage = self.storage[resourceType] / self.storage[max];
            const delta = Math.round((selfPercentage - storagePercentage) * self.storage[max]);
            // prevent jittering back and forth
            if (delta <= 1 && delta >= -1) {
                continue;
            }
            // TODO re-think sendResource
            if (delta > 0) {
                await sendResource(ctx, resourceType, delta, self, storage);
            } else {
                await sendResource(ctx, resourceType, -delta, storage, self);
            }
        }
    }

    private async pushTowers(ctx: Context, self: Unit, resourceType: Resource, nearby: Unit[]): Promise<void> {
        // look for not full transfer towers
        const towers: Unit[] = _.filter(nearby,
            (unit) => unit.details.type === 'transfer_tower' &&
                unit.storage[resourceType] < unit.storage[resourceType === 'iron' ? 'maxIron' : 'maxFuel']);
        let balanceResource = self.storage[resourceType] / towers.length;
        if (balanceResource > transferLimit) balanceResource = 5;
        if (balanceResource < 1) {
            return;
        }
        for (const tower of towers) {
            await sendResource(ctx, resourceType, balanceResource, self, tower);
        }
    }
}