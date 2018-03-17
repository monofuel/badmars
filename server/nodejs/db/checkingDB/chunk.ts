import * as DB from '../';
import { assert } from 'chai';
import Context from '../../context';
import { startDBCall } from '../helper';

export default class DBChunk implements DB.DBChunk {
  private db1: DB.DBChunk;
  private db2: DB.DBChunk;
  constructor(db1: DB.DBChunk, db2: DB.DBChunk) {
    this.db1 = db1;
    this.db2 = db2;
  }

  public async each(ctx: Context, fn: DB.Handler<Chunk>): Promise<void> {
    await this.db1.each(ctx, async (ctx: Context, chunk1: Chunk) => {
      const chunk2 = await this.db2.get(ctx, chunk1.hash);
      assert.deepEqual(chunk1, chunk2);
      await fn(ctx, chunk1);
    });
  }
  public async get(ctx: Context, hash: string): Promise<Chunk | null> {
    const chunk1 = await this.db1.get(ctx, hash);
    const chunk2 = await this.db2.get(ctx, hash);
    assert.deepEqual(chunk1, chunk2);
    return chunk1;
  }
  public async patch(ctx: Context, hash: string, chunk: Partial<Chunk>): Promise<Chunk> {
    const chunk1 = await this.db1.patch(ctx, hash, chunk);
    const chunk2 = await this.db2.patch(ctx, hash, chunk);
    assert.deepEqual(chunk1, chunk2);
    return chunk1;
  }
  public async create(ctx: Context, chunk: Chunk): Promise<Chunk> {
    const chunk1 = await this.db1.create(ctx, chunk);
    const chunk2 = await this.db2.create(ctx, chunk);
    assert.deepEqual(chunk1, chunk2);
    return chunk1;
  }
}
