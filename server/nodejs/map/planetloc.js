/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


import _ from 'lodash';

import { checkContext, DetailedError } from '../util/logger';
import env from '../config/env';
import { getTypeName } from './tiletypes';
import Direction from '../map/directions';

import type MonoContext from '../util/monoContext';
import type Map from './map';
import type Chunk from './chunk';

/**
 * Representation of a point on a planet
 */

export default class PlanetLoc {
	x: number;
	y: number;
	map: Map;
	hash: TileHash;
	chunk: Chunk;
	local_x: number;
	local_y: number;
	tileType: TileCode;

	// temp storage used by pathfinder
	//TODO these should not be here
	prev: ?PlanetLoc;
	realCost: number;
	cost: number;

	constructor(map: Map, chunk: Chunk, x: number, y: number) {
		if(!map) {
			throw new DetailedError('planetloc missing map', { x, y });
		}
		if (!chunk) {
			throw new DetailedError('planetloc missing chunk', { x, y });
		}

		this.x = Math.floor(x);
		this.y = Math.floor(y);
		this.map = map;
		this.hash = x + ':' + y;
		this.chunk = chunk;

		this.local_x = this.x - (chunk.x * chunk.chunkSize);
		this.local_y = this.y - (chunk.y * chunk.chunkSize);

		if(this.local_x < 0) {
			this.local_x = this.local_x + chunk.chunkSize;
		}

		if(this.local_y < 0) {
			this.local_y = this.local_y + chunk.chunkSize;
		}


		//console.log("x: " + this.x + ", y: " + this.y + " chunkx: " + this.chunk.x + ", chunky: " + this.chunk.y + " localx: " + this.local_x + " localy: " + this.local_y);

		if(!this.chunk) {
			throw new DetailedError('couldnt find chunk', { x, y, hash: chunk.hash });
		}

		if(this.local_x > this.chunk.navGrid.length || this.local_y > this.chunk.navGrid[0].length) {
			throw new DetailedError('invalid chunk', { x, y, chunkX: this.chunk.x, chunkY: this.chunk.y });
		}

		this.tileType = this.chunk.navGrid[this.local_x][this.local_y];

	}

	distance(tile: PlanetLoc): number {
		const deltaX = Math.abs(this.x - tile.x);
		const deltaY = Math.abs(this.y - tile.y);

		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}
	
	async getUnits(ctx: MonoContext): Promise<Array<Unit>> {
		checkContext(ctx, 'getUnits');
		const unitMap = await this.chunk.getUnits(ctx);
		return _.filter(unitMap, (unit: Unit): boolean => unit.location.hash.includes(this.hash));
	}

	toString(): string {
		let line = 'x: ' + this.x;
		line += ', y: ' + this.y;
		line += ', type: ' + getTypeName(this.tileType);
		if(this.map) {
			line += ', map: ' + this.map.name;
		}
		return line;
	}
	async N(ctx: MonoContext): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx,this.x, this.y + 1);
	}
	async S(ctx: MonoContext): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx,this.x, this.y - 1);
	}
	async E(ctx: MonoContext): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx,this.x + 1, this.y);
	}
	async W(ctx: MonoContext): Promise<PlanetLoc> {
		return await this.map.getLoc(ctx,this.x - 1, this.y);
	}

	async getDirTile(ctx: MonoContext, dir: Dir): Promise<PlanetLoc> {
		switch(dir) {
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
		if(!env.debug) {
			return;
		}
		const invalid = (reason: string) => {
			throw new Error(this.hash + ': ' + reason);
		};
		if(this.x == null) {
			invalid('bad x value:' + this.x);
		}
		if(this.y == null) {
			invalid('bad x value:' + this.y);
		}

		if(!this.map) {
			invalid('bad map');
		}
		if(!this.hash || this.hash.split(':').length != 2) {
			invalid('bad hash: ' + this.hash);
		}
		if(!this.chunk) {
			invalid('bad chunk');
		}
		if(this.local_x == null) {
			invalid('bad local x');
		}
		if(this.local_y == null) {
			invalid('bad local y');
		}
		if(this.tileType == null) {
			invalid('bad tile type');
		}

		const real_x = (this.chunk.chunkSize * this.chunk.x) + this.local_x;
		const real_y = (this.chunk.chunkSize * this.chunk.y) + this.local_y;
		if(this.x != real_x) {
			invalid('x does not match up: ' + real_x + ' != ' + this.x);
		}
		if(this.y != real_y) {
			invalid('y does not match up: ' + real_y + ' != ' + this.y);
		}


	}

	equals(otherLoc: PlanetLoc): boolean {
		if(!otherLoc || !otherLoc.map) return false;
		return(otherLoc.x === this.x &&
			otherLoc.y === this.y &&
			otherLoc.map.name === this.map.name);
	}
}