import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';
import GamePlanet from '../../map/map';
import DBChunk from './chunk';
import DBChunkLayer from './chunkLayer';
import DBUnit from './unit';
// import DBUnitStat from './unitStat';
import DBUnitStat from '../memoryDB/unitStat';
import DBFactoryQueue from './factoryQueue';
import { startDBCall } from '../helper';

export default class Planet implements DB.Planet {
	conn: r.Connection;
	table: r.Table;

	planet: GamePlanet;
	name: string;

	chunk: DBChunk;
	chunkLayer: DBChunkLayer;
	unit: DBUnit;
	factoryQueue: DBFactoryQueue;
	unitStat: DBUnitStat;

	constructor(name: string, seed?: number) {
		this.name = name;
		this.planet = new GamePlanet(name, seed);
		this.chunk = new DBChunk();
		this.chunkLayer = new DBChunkLayer();
		this.unit = new DBUnit();
		this.unitStat = new DBUnitStat();
		this.factoryQueue = new DBFactoryQueue();
	}
	public async init(ctx: Context, conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = r.table('planet');

		await this.chunk.init(ctx, conn, this.name);
		await this.chunkLayer.init(ctx, conn, this.name);
		await this.unit.init(ctx, conn, this.name);
		// await this.unitStat.init(ctx, conn, this.name);
		await this.unitStat.init(ctx);
		await this.factoryQueue.init(ctx, conn, this.name);
	}
	public async setupSchema(ctx: Context, conn: r.Connection): Promise<void> {
		await this.chunk.setupSchema(ctx, conn, this.name);
		await this.chunkLayer.setupSchema(ctx, conn, this.name);
		await this.unit.setupSchema(ctx, conn, this.name);
		// TODO use rethink unit stats
		// await this.unitStat.setupSchema(ctx, conn, this.name);
		await this.factoryQueue.setupSchema(ctx, conn, this.name);
	}
	async patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void> {
		const call = await startDBCall(ctx, 'planet.patch');
		const result = await this.table.get(this.planet.name).update(patch, { returnChanges: 'always' as any }).run(this.conn);
		await call.end();
		return (result as any).changes[0].new_val;
	}
	async addUser(ctx: Context, uuid: string): Promise<void> {
		await this.table.get(this.planet.name).update({
			users: r.row('users').append(uuid)
		}).run(this.conn);
	}
}
