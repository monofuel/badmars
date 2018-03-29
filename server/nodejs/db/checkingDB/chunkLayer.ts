import * as DB from '../';
import Context from '../../context';
import GameChunkLayer from '../../map/chunkLayer';
import { expectEqual } from '../../util';
export default class ChunkLayer implements DB.DBChunkLayer {
  private db1: DB.DBChunkLayer;
  private db2: DB.DBChunkLayer;
  constructor(db1: DB.DBChunkLayer, db2: DB.DBChunkLayer) {
    this.db1 = db1;
    this.db2 = db2;
  }
  public async create(ctx: Context, layer: GameChunkLayer): Promise<GameChunkLayer> {
    const layer1 = await this.db1.create(ctx, layer);
    const layer2 = await this.db2.create(ctx, layer);
    expectEqual(layer1, layer2);
    return layer1;
  }
  public findChunkForUnit(ctx: Context, uuid: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  public each(ctx: Context, fn: DB.Handler<GameChunkLayer>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public async get(ctx: Context, hash: string): Promise<GameChunkLayer> {
    const layer1 = await this.db1.get(ctx, hash);
    const layer2 = await this.db2.get(ctx, hash);
    expectEqual(layer1, layer2);
    return layer1;
  }
  public async setEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string):
    Promise<GameChunkLayer> {
    const layer1 = await this.db1.setEntity(ctx, hash, layer, uuid, tileHash);
    const layer2 = await this.db2.setEntity(ctx, hash, layer, uuid, tileHash);
    expectEqual(layer1, layer2);
    return layer1;
  }
  public async clearEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string):
    Promise<GameChunkLayer> {
    const layer1 = await this.db1.clearEntity(ctx, hash, layer, uuid, tileHash);
    const layer2 = await this.db2.clearEntity(ctx, hash, layer, uuid, tileHash);
    expectEqual(layer1, layer2);
    return layer1;
  }
}
