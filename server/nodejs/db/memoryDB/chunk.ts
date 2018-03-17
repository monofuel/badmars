import * as DB from '../';
import Context from '../../context';
import { startDBCall } from '../helper';

export default class DBChunk implements DB.DBChunk {

  private chunks: { [key: string]: Chunk } = {};

  public async init(ctx: Context): Promise<void> {
    ctx.check('chunk.init');
  }

  public async each(ctx: Context, fn: DB.Handler<Chunk>): Promise<void> {
    for (const hash in this.chunks) {
      await fn(ctx, this.chunks[hash]);
    }
  }
  public async get(ctx: Context, hash: string): Promise<Chunk | null> {
    return this.chunks[hash] || null;
  }
  public async patch(ctx: Context, hash: string, chunk: Partial<Chunk>): Promise<Chunk> {
    const prev = this.chunks[hash];
    Object.assign(prev, chunk);
    return prev;
  }
  public async create(ctx: Context, chunk: Chunk): Promise<Chunk> {
    const call = startDBCall(ctx, 'chunk.create');
    this.chunks[chunk.hash] = chunk;
    await call.end();
    return chunk;
  }
}
