/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';

import { LAND } from '../map/tiletypes';
import DIRECTION from '../map/directions';

class SimplePath {
	constructor(start, end) {
		this.start = start;
		this.end = end;
		if(!this.start || !this.end || this.start.map !== this.end.map) {
			console.log('invalid start and end points');
			console.log(new Error().stack);
			console.log(this.start.toString());
			console.log(this.end.toString());
		}
		this.map = this.start.map;
	}

	//given a tile, find the next one
	async getNext(tile) {
		console.log(tile.toString());
		console.log(this.end.toString());
		if(tile.x < this.end.x) {
			let nextTile = await this.map.getLoc(tile.x + 1, tile.y);
			if(nextTile.tileType === LAND) {
				return DIRECTION.E;
			}
		}
		if(tile.x > this.end.x) {
			let nextTile = await this.map.getLoc(tile.x - 1, tile.y);
			if(nextTile.tileType === LAND) {
				return DIRECTION.W;
			}
		}
		if(tile.y < this.end.y) {
			let nextTile = await this.map.getLoc(tile.x, tile.y + 1);
			if(nextTile.tileType === LAND) {
				return DIRECTION.N;
			}
		}
		if(tile.y > this.end.y) {
			let nextTile = await this.map.getLoc(tile.x, tile.y - 1);
			if(nextTile.tileType === LAND) {
				return DIRECTION.S;
			}
		}
		return DIRECTION.C;
	}
}

module.exports = SimplePath;
