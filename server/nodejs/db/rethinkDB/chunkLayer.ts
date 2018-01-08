import * as r from 'rethinkdb';
import * as DB from '../';
import Context from '../../context';
import { startDBCall, createTable } from '../helper';
import GameChunkLayer from '../../map/chunkLayer';
import { DetailedError } from '../../logger/index';

export default class ChunkLayer implements DB.DBChunkLayer {
	conn: r.Connection;
	table: r.Table;
	public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
		this.conn = conn;
		this.table = r.table(`${planetName}_chunk`);
	}
	public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
		this.table = await createTable(conn, `${planetName}_chunkLayer`, 'hash');
	}
	create(ctx: Context, layer: GameChunkLayer): Promise<GameChunkLayer> {
		throw new Error("Method not implemented.");
	}
	findChunkForUnit(ctx: Context, uuid: string): Promise<string> {
		throw new Error("Method not implemented.");
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