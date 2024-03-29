import db from '../../db';
import Context from '../../context';
import logger, { DetailedError } from '../../logger';
import * as _ from 'lodash';

import UnitAI from './';
import { unitDistance, sendResource } from '../unit';

const transferLimit = 5;

export default class TransferTowerAI implements UnitAI {
  public async actionable(ctx: Context, unit: Unit): Promise<boolean> {
    if (unit.details.ghosting) {
      return false;
    }
    return unit.details.type === 'transfer_tower';
  }
  public async simulate(ctx: Context, self: Unit): Promise<void> {
    ctx.check('transferTower simulate');
    const planetDB = await db.getPlanetDB(ctx, self.location.map);
    const { storage } = self;
    if (!storage) {
      throw new DetailedError('unit missing storage', { uuid: self.uuid });
    }

    const units: Unit[] = await planetDB.planet.getNearbyUnitsFromChunkWithTileRange(ctx,
      self.location.chunkHash[0], storage.transferRange);
    const nearby = _.filter(units, (unit) => !unit.details.ghosting &&
      unitDistance(self, unit) < storage.transferRange && unit.uuid !== self.uuid);

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
    const { storage } = self;
    if (!storage) {
      throw new DetailedError('unit missing storage', { uuid: self.uuid });
    }

    // find receiver storages that are not full
    const receivers: Unit[] = nearby.filter(
      (unit) => unit.details.type === 'storage' &&
        unit.storage &&
        unit.storage.receive &&
        unit.storage[resourceType] < unit.storage[resourceType === 'iron' ? 'maxIron' : 'maxFuel']);
    let balanceResource = storage[resourceType] / receivers.length;
    if (balanceResource > transferLimit) { balanceResource = 5; }
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
    const storages: Unit[] = nearby.filter(
      (unit) => unit.details.type === 'storage' &&
        unit.storage &&
        !unit.storage.receive);
    for (const storage of storages) {
      if (!storage.storage || !self.storage) {
        continue;
      }
      const storagePercentage = storage.storage[resourceType] / storage.storage[max];
      const selfPercentage = self.storage[resourceType] / self.storage[max];
      let delta = Math.round(((selfPercentage - storagePercentage) * self.storage[max]) / 2);
      if (delta > 5) {
        delta = 5;
      } else if (delta < -5) {
        delta = -5;
      }
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
    const max = resourceType === 'iron' ? 'maxIron' : 'maxFuel';
    // look for not full transfer towers
    const towers: Unit[] = nearby.filter(
      (unit) => unit.details.type === 'transfer_tower' &&
        unit.storage &&
        unit.storage[resourceType] < unit.storage[max]);
    for (const tower of towers) {
      if (!tower.storage || !self.storage) {
        continue;
      }
      const storagePercentage = tower.storage[resourceType] / tower.storage[max];
      const selfPercentage = self.storage[resourceType] / self.storage[max];
      let delta = Math.round(((selfPercentage - storagePercentage) * self.storage[max]) / 2);
      if (delta > 5) {
        delta = 5;
      } else if (delta < -5) {
        delta = -5;
      }
      // prevent jittering back and forth
      if (delta <= 1 && delta >= -1) {
        continue;
      }
      // only push resources
      if (delta > 0) {
        await sendResource(ctx, resourceType, delta, self, tower);
      }
    }
  }
}
