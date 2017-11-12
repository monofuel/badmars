import * as DB from '../';
import Context from '../../context';
// import { Lock } from 'semaphore-async-await';
import GameChunk from '../../map/chunk';

export default class Chunk implements DB.Chunk {

    public async init(ctx: Context): Promise<void> {
        
    }

    each(ctx: Context, fn: DB.Handler<GameChunk>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    get(ctx: Context, hash: string): Promise<GameChunk> {
        throw new Error("Method not implemented.");
    }
    patch(ctx: Context, uuid: string, chunk: Partial<GameChunk>): Promise<GameChunk> {
        throw new Error("Method not implemented.");
    }
    create(ctx: Context, chunk: GameChunk): Promise<GameChunk> {
        throw new Error("Method not implemented.");
    }
}