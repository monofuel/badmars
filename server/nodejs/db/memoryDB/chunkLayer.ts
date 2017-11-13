import * as DB from '../';
import Context from '../../context';
// import { Lock } from 'semaphore-async-await';
import GameChunkLayer from '../../map/chunkLayer';

export default class ChunkLayer implements DB.ChunkLayer {
    create(ctx: Context, layer: GameChunkLayer): Promise<GameChunkLayer> {
        throw new Error("Method not implemented.");
    }
    findChunkForUnit(ctx: Context, uuid: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    public async init(ctx: Context): Promise<void> {

    }
    each(ctx: Context, fn: DB.Handler<GameChunkLayer>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    get(ctx: Context, hash: string): Promise<GameChunkLayer> {
        throw new Error("Method not implemented.");
    }
    setEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer> {
        throw new Error("Method not implemented.");
    }
    clearEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer> {
        throw new Error("Method not implemented.");
    }
}