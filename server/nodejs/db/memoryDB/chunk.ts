import * as DB from '../';
import Context from '../../context';
import GameChunk from '../../map/chunk';
import { startDBCall } from '../helper';

export default class Chunk implements DB.Chunk {

    private chunks: { [key: string]: GameChunk } = {};

    public async init(ctx: Context): Promise<void> {
        ctx.check('user.init');
    }

    public async each(ctx: Context, fn: DB.Handler<GameChunk>): Promise<void> {
        for (const hash in this.chunks) {
            await fn(ctx, this.chunks[hash]);
        }
    }
    public async get(ctx: Context, hash: string): Promise<GameChunk | null> {
        return this.chunks[hash];
    }
    public async patch(ctx: Context, hash: string, chunk: Partial<GameChunk>): Promise<GameChunk> {
        const prev = this.chunks[hash];
        Object.assign(prev, chunk);
        return prev;
    }
    public async create(ctx: Context, chunk: GameChunk): Promise<GameChunk> {
        const call = startDBCall(ctx, 'user.create');
        this.chunks[chunk.hash] = chunk;
        await call.end();
        return chunk;
    }
}