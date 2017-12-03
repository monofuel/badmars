
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import { DetailedError } from '../logger';
import Map from '../map/map';
import PlanetLoc from '../map/planetloc';
import Context from '../context';

import { LAND } from '../map/tiletypes';

export default class SimplePath {
	start: PlanetLoc;
	end: PlanetLoc;
	map: Map;
	constructor(start: PlanetLoc, end: PlanetLoc) {
		this.start = start;
		this.end = end;
		if (!this.start || !this.end || this.start.map !== this.end.map) {
			throw new DetailedError('invalid start and end points', {
				start: start.toString(),
				end: end.toString(),
			});
		}
		this.map = this.start.map;
	}

	//given a tile, find the next one
	async getNext(ctx: Context, tile: PlanetLoc): Promise<Dir> {
		if (tile.x < this.end.x) {
			const nextTile = await this.map.getLoc(ctx, tile.x + 1, tile.y);
			if (nextTile.tileType === LAND) {
				return 'E';
			}
		}
		if (tile.x > this.end.x) {
			const nextTile = await this.map.getLoc(ctx, tile.x - 1, tile.y);
			if (nextTile.tileType === LAND) {
				return 'W';
			}
		}
		if (tile.y < this.end.y) {
			const nextTile = await this.map.getLoc(ctx, tile.x, tile.y + 1);
			if (nextTile.tileType === LAND) {
				return 'N';
			}
		}
		if (tile.y > this.end.y) {
			const nextTile = await this.map.getLoc(ctx, tile.x, tile.y - 1);
			if (nextTile.tileType === LAND) {
				return 'S';
			}
		}
		return 'C';
	}
}

module.exports = SimplePath;
