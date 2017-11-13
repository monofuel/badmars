
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
import Context from '../context';
import db from '../db';
import { checkContext } from '../logger';
import PlanetLoc, { getLocationDetails } from './planetloc';
import Map from './map';
import ChunkLayer from './chunkLayer';

export default interface Chunk {
	x: number;
	y: number;
	hash: TileHash;
	map: string;

	grid: Array<Array<number>>;
	navGrid: Array<Array<TileCode>>;
	chunkSize: number;

}

export async function newChunk(ctx: Context, map: string, x: number, y: number): Promise<Chunk> {
	return {
		x,
		y,
		hash: `${x}:${y}`,
		map,
		grid: [],
		navGrid: [],
		chunkSize: ctx.env.chunkSize,
	}
}

export async function planetLocsForChunk(ctx: Context, chunk: Chunk): Promise<PlanetLoc[]> {
	const planetDB = await db.getPlanetDB(ctx, chunk.map);

	ctx.check('planetLocsForChunk');
	const layer = await planetDB.chunkLayer.get(ctx, chunk.hash);
	const tiles = [];
	for (let i = 0; i < chunk.chunkSize; i++) {
		for (let j = 0; j < chunk.chunkSize; j++) {
			const x = i + (chunk.x * chunk.chunkSize);
			const y = j + (chunk.y * chunk.chunkSize);
			tiles.push(new PlanetLoc(planetDB.planet, chunk, layer, getLocationDetails(x, y, chunk.chunkSize)));
		}
	}
	return tiles;
}

/*

	async getLayer(ctx: Context): Promise<ChunkLayer> {
		const planetDB = await db.getPlanetDB(ctx, this.map);
		return await planetDB.chunkLayer.get(ctx, this.hash)
	}

	async getTiles(ctx: Context): Promise<Array<PlanetLoc>> {
		const planetDB = await db.getPlanetDB(ctx, this.map);

		checkContext(ctx, 'getTiles');
		const map: Map = planetDB.planet;
		const layer = await this.getLayer(ctx);
		const tiles = [];
		for (let i = 0; i < this.chunkSize; i++) {
			for (let j = 0; j < this.chunkSize; j++) {
				const x = i + (this.x * this.chunkSize);
				const y = j + (this.y * this.chunkSize);
				tiles.push(new PlanetLoc(map, this, layer, getLocationDetails(x, y, this.chunkSize)));
			}
		}
		return tiles;
	}

	syncValidate() {
		if (!env.debug) {
			return;
		}
		const invalid = (reason: string) => {
			throw new DetailedError('bad chunk: ' + reason, {
				hash: this.hash,
				x: this.x,
				y: this.y,
			});
		};

		if (this.x == null) {
			invalid('bad chunk x');
		}
		if (this.y == null) {
			invalid('bad chunk y');
		}
		if (!this.hash) {
			invalid('missing chunk hash');
		}
		if (this.hash.split(':').length !== 2) {
			invalid('bad chunk hash: ' + this.hash);
		}
		if (!this.map) {
			invalid('bad map');
		}
		if (this.chunkSize == null) {
			invalid('missing chunk size');
		}
		if (this.grid.length !== this.chunkSize + 1) {
			invalid('bad chunk grid. got ' + this.grid.length + ', expected ' + (this.chunkSize + 1));
		}
		for (const row of this.grid) {
			if (row.length !== this.chunkSize + 1) {
				invalid('bad row length. got ' + row.length + ', expected ' + (this.chunkSize + 1));
			}
		}
		if (this.navGrid.length !== this.chunkSize) {
			invalid('bad chunk nav grid. got ' + this.navGrid.length + ', expected ' + (this.chunkSize));
		}
		for (const row of this.navGrid) {
			if (row.length !== this.chunkSize) {
				invalid('bad nav row length. got ' + row.length + ', expected ' + (this.chunkSize + 1));
			}
		}
	}

	async validate(ctx: Context): Promise<void> {
		checkContext(ctx, 'validate');
		if (!env.debug) {
			return;
		}

		this.syncValidate();
	}
}
*/