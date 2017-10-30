
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
import Context from '../util/context';

import env from '../config/env';
import { DetailedError, checkContext } from '../util/logger';
import PlanetLoc, { getLocationDetails } from './planetloc';
import Map from './map';
import ChunkLayer from './chunkLayer';

type TileCode = number;

export default class Chunk {
	x: number;
	y: number;
	hash: string;
	map: string;

	grid: Array<Array<number>>;
	navGrid: Array<Array<TileCode>>;
	chunkSize: number;

	constructor(map: string, x: number, y: number) {
		if (!map) {
			throw new Error('chunk missing map');
		}
		this.x = parseInt(x as any) || 0;
		this.y = parseInt(y as any) || 0;
		this.hash = this.x + ':' + this.y;
		this.map = map;
		this.grid = []; //grid size should be chunkSize + 1
		this.navGrid = []; //tile size should be chunkSize
		this.chunkSize = 16;
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

	equals(other: Chunk): boolean {
		return this.hash === other.hash;
	}

	clone(object: any) {
		for (const key in object) {
			(this as any)[key] = _.cloneDeep(object[key]);
		}
		this.x = parseInt(this.x as any);
		this.y = parseInt(this.y as any);

		if (!this.map) {
			throw new DetailedError('invalid chunk without map', { x: this.x, y: this.y });
		}
		this.syncValidate();
	}

	async getLayer(ctx: Context): Promise<ChunkLayer> {
		const { db } = ctx;
		const planetDB = await db.getPlanetDB(ctx, this.map);
		return await planetDB.chunkLayer.get(ctx, this.hash)
	}

	async getTiles(ctx: Context): Promise<Array<PlanetLoc>> {
		const { db } = ctx;
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
}