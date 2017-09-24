
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { DetailedError } from '../util/logger';
import Map from '../map/map';
import PlanetLoc from '../map/planetloc';
import MonoContext from '../util/monoContext';

import { LAND } from '../map/tiletypes';
import DIRECTION from '../map/directions';

class SimplePath {
	start: PlanetLoc;
	end: PlanetLoc;
	map: Map;
	constructor(start: PlanetLoc, end: PlanetLoc) {
		this.start = start;
		this.end = end;
		if(!this.start || !this.end || this.start.map !== this.end.map) {
			throw new DetailedError('invalid start and end points', {
				start: start.toString(),
				end: end.toString(),
			});
		}
		this.map = this.start.map;
	}

	//given a tile, find the next one
	async getNext(ctx: MonoContext, tile: PlanetLoc): Promise<Symbol> {
		if(tile.x < this.end.x) {
			const nextTile = await this.map.getLoc(ctx,tile.x + 1, tile.y);
			if(nextTile.tileType === LAND) {
				return DIRECTION.E;
			}
		}
		if(tile.x > this.end.x) {
			const nextTile = await this.map.getLoc(ctx,tile.x - 1, tile.y);
			if(nextTile.tileType === LAND) {
				return DIRECTION.W;
			}
		}
		if(tile.y < this.end.y) {
			const nextTile = await this.map.getLoc(ctx,tile.x, tile.y + 1);
			if(nextTile.tileType === LAND) {
				return DIRECTION.N;
			}
		}
		if(tile.y > this.end.y) {
			const nextTile = await this.map.getLoc(ctx,tile.x, tile.y - 1);
			if(nextTile.tileType === LAND) {
				return DIRECTION.S;
			}
		}
		return DIRECTION.C;
	}
}

module.exports = SimplePath;
