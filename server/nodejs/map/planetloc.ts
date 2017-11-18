
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


import * as _ from 'lodash';

import { DetailedError } from '../logger';
import env from '../config/env';
import { getTypeName } from './tiletypes';
import Direction from '../map/directions';

import db from '../db';
import Context from '../context';
import Map from './map';
import Chunk from './chunk';
import ChunkLayer from './chunkLayer';
import Unit from '../unit/unit';

type TileHash = string;
type TileCode = 0 | 1 | 2 | 3;
type Dir = Symbol;

/**
 * Representation of a point on a planet
 */

export default class PlanetLoc {
	x: number;
	y: number;
	map: Map;
	hash: TileHash;
	chunk: Chunk;
	chunkLayer: ChunkLayer;
	localX: number;
	localY: number;
	tileType: TileCode;

	// temp storage used by pathfinder
	//TODO these should not be here
	prev: null | PlanetLoc;
	realCost: number;
	cost: number;

	constructor(map: Map, chunk: Chunk, chunkLayer: ChunkLayer, { x, y, localX, localY }: LocationDetailsType) {

		if (!map) {
			throw new DetailedError('planetloc missing map', { x, y });
		}
		if (!chunk) {
			throw new DetailedError('planetloc missing chunk', { x, y });
		}

		this.x = x;
		this.y = y;
		this.map = map;
		this.hash = x + ':' + y;
		this.chunk = chunk;
		this.chunkLayer = chunkLayer;

		this.localX = localX;
		this.localY = localY;

		this.tileType = this.chunk.navGrid[this.localX][this.localY] as any;
	}

	distance(tile: PlanetLoc): number {
		const deltaX = Math.abs(this.x - tile.x);
		const deltaY = Math.abs(this.y - tile.y);

		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

	async getUnits(ctx: Context): Promise<Array<Unit>> {
		const planetDB = await db.getPlanetDB(ctx, this.map.name);
		ctx.check('getUnits');
		const uuids = [
			...Object.values(await this.chunkLayer.ground),
			...Object.values(await this.chunkLayer.resources)
		];
		const units = Object.values(await planetDB.unit.getBulk(ctx, uuids));
		return _.filter(units,
			(unit: Unit): boolean => (unit.location.hash as any).includes(this.hash));
	}

	async isOpen(ctx: Context): Promise<boolean> {
		const units = await this.getUnits(ctx);
		return units.length === 0;
	}

	toString(): string {
		let line = 'x: ' + this.x;
		line += ', y: ' + this.y;
		line += ', type: ' + getTypeName(this.tileType);
		if (this.map) {
			line += ', map: ' + this.map.name;
		}
		return line;
	}
	async N(ctx: Context): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx, this.x, this.y + 1);
	}
	async S(ctx: Context): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx, this.x, this.y - 1);
	}
	async E(ctx: Context): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx, this.x + 1, this.y);
	}
	async W(ctx: Context): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx, this.x - 1, this.y);
	}

	async getDirTile(ctx: Context, dir: Dir): Promise<PlanetLoc> {
		switch (dir) {
			case Direction.N:
				return await this.N(ctx);
			case Direction.S:
				return await this.S(ctx);
			case Direction.E:
				return await this.E(ctx);
			case Direction.W:
				return await this.W(ctx);
			case Direction.C:
			default:
				return this;
		}

	}

	validate() {
		if (!env.debug) {
			return;
		}
		const invalid = (reason: string) => {
			throw new DetailedError('bad tile: ' + reason, {
				hash: this.hash,
				x: this.x,
				y: this.y,
				chunkX: this.chunk.x,
				chunkY: this.chunk.y,
				localX: this.localX,
				localY: this.localY
			});
		};
		if (this.x == null) {
			invalid('bad x value:' + this.x);
		}
		if (this.y == null) {
			invalid('bad x value:' + this.y);
		}
		if (!this.map) {
			invalid('bad map');
		}
		if (!this.hash || this.hash.split(':').length != 2) {
			invalid('bad hash: ' + this.hash);
		}
		if (!this.chunk) {
			invalid('bad chunk');
		}
		if (this.localX == null) {
			invalid('bad local x');
		}
		if (this.localY == null) {
			invalid('bad local y');
		}
		if (this.localY > this.chunk.navGrid[0].length) {
			invalid('bad local y');
		}
		if (this.localX > this.chunk.navGrid.length) {
			invalid('bad local x');
		}
		if (this.tileType == null) {
			invalid('bad tile type');
		}

		const real_x = (this.chunk.chunkSize * this.chunk.x) + this.localX;
		const real_y = (this.chunk.chunkSize * this.chunk.y) + this.localY;
		if (this.x != real_x) {
			invalid('x does not match up: ' + real_x + ' != ' + this.x);
		}
		if (this.y != real_y) {
			invalid('y does not match up: ' + real_y + ' != ' + this.y);
		}
	}

	equals(otherLoc: PlanetLoc): boolean {
		if (!otherLoc || !otherLoc.map) return false;
		return (otherLoc.x === this.x &&
			otherLoc.y === this.y &&
			otherLoc.map.name === this.map.name);
	}
}

type LocationDetailsType = {
	x: number,
	y: number,
	chunkX: number,
	chunkY: number,
	localX: number,
	localY: number
};

export function getLocationDetails(x: number, y: number, chunkSize: number): LocationDetailsType {
	x = Math.floor(x);
	y = Math.floor(y);

	const chunkX = Math.floor(x / chunkSize);
	const chunkY = Math.floor(y / chunkSize);
	const localX = x - (chunkX * chunkSize);
	const localY = y - (chunkY * chunkSize);

	return {
		x,
		y,
		chunkX,
		chunkY,
		localX,
		localY,
	};
}