import Context from '../context';

export default interface ChunkLayer {
	x: number;
	y: number;
	hash: string;
	map: string;

	units: EntityMapType;
	resources: EntityMapType;
	airUnits: EntityMapType;

}

export async function newChunkLayer(ctx: Context, map: string, x: number, y: number): Promise<ChunkLayer> {
	return {
		x,
		y,
		hash: `${x}:${y}`,
		map,
		units: {},
		resources: {},
		airUnits: {}
	}
}


/*
	async getUnitsMap(ctx: Context, hash: TileHash): Promise<UnitMap> {
		const planetDB = await db.getPlanetDB(ctx, this.map);

		checkContext(ctx, 'getUnitsMap');
		await this.refresh(ctx);
		const uuids = [];
		let uuid = this.units[hash];
		if (uuid) {
			uuids.push(uuid);
		}

		uuid = this.resources[hash];
		if (uuid) {
			//console.log('resource',uuid);
			uuids.push(uuid);
		}

		uuid = this.airUnits[hash];
		if (uuid) {
			uuids.push(uuid);
		}
		return await planetDB.unit.getBulk(ctx, uuids);
	}

	async getUnits(ctx: Context): Promise<Unit[]> {
		const planetDB = await db.getPlanetDB(ctx, this.map);

		checkContext(ctx, 'getUnits');
		await this.refresh(ctx);
		const unitUuids: UUID[] = _.union(_.map(this.resources), _.map(this.units), _.map(this.airUnits));
		const unitMap = await planetDB.unit.getBulk(ctx, unitUuids);
		return Object.values(unitMap);
	}

	async moveUnit(ctx: Context, unit: Unit, newTile: PlanetLoc): Promise<void> {
		throw new Error('not implemented')
		/*
		checkContext(ctx, 'moveUnit');
		await this.refresh(ctx);
		const newChunk: Chunk = newTile.chunk;
		const oldTiles = await unit.getLocs(ctx);
		if (oldTiles[0].chunk.units[oldTiles[0].hash] !== unit.uuid) {
			throw new DetailedError('unit not at proper tile', {
				uuid: unit.uuid,
				found: oldTiles[0].chunk.units[oldTiles[0].hash]
			});
		}
		await this.getChunkDB(ctx).setUnit(ctx, newChunk, unit.uuid, newTile.hash);

		await newChunk.refresh(ctx, { force: true });
		if (unit.uuid !== newChunk.units[newTile.hash]) {
			throw new DetailedError('wrong new position', { hash: newTile.hash, uuid: unit.uuid, otherUuid: newChunk.units[newTile.hash] });
		}
		await oldTiles[0].chunk.clearUnit(ctx, unit.uuid, oldTiles[0].hash);
	}

	async clearUnit(ctx: Context, uuid: UUID, tileHash: TileHash): Promise<void> {
		throw new Error('not implemented')
		checkContext(ctx, 'clearUnit');
		const table = ctx.db.chunks[this.map].getTable();
		const conn = ctx.db.chunks[this.map].getConn();
		const unitUpdate: any = {};
		unitUpdate[tileHash] = true;
		if (this.units[tileHash] !== uuid) {
			throw new DetailedError('wrong unit at old tile!', { found: this.units[tileHash], expected: uuid });
		}
		delete this.units[tileHash];

		const delta: r.WriteResult = await table.get(this.hash)
			.replace((r.row as any).without({ units: unitUpdate }), { returnChanges: true }).run(conn);
		if (delta.replaced !== 1) {
			throw new DetailedError('failed clearing position', { tileHash });
		} else {
			const newChunk = (delta as any).changes[0].new_val;
			if (newChunk.units[tileHash] === uuid) {
				throw new DetailedError('unit did not get removed from position', { uuid, found: newChunk.units[tileHash] });
			}
		}
	}

	async addUnit(ctx: Context, uuid: UUID, tileHash: TileHash): Promise<void> {
		throw new Error('not implemented')
		checkContext(ctx, 'addUnit');
		await this.getChunkDB(ctx).setUnit(ctx, this, uuid, tileHash);

		await this.refresh(ctx);
		if (uuid !== this.units[tileHash]) {
			throw new DetailedError('wrong new position after refresh', { uuid, tileHash, found: this.units[tileHash] });
		}
	}


	async addResource(ctx: Context, uuid: UUID, tileHash: TileHash): Promise<void> {
		throw new Error('not implemented')
		checkContext(ctx, 'addResource');
		await this.getChunkDB(ctx).setResource(ctx, this, uuid, tileHash);
		await this.refresh(ctx);
		if (uuid !== this.resources[tileHash]) {
			throw new DetailedError('failed to add resource after refresh', { uuid, tileHash, found: this.resources[tileHash] });
		}
	}

	async refresh(ctx: Context): Promise<void> {
		throw new Error('not implemented')
	}
*/