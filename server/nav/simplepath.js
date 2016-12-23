/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../db/db.js');
import env from '../config/env';
var logger = require('../util/logger.js');

var TILETYPES = require('../map/tiletypes.js');
var DIRECTION = require('../map/directions.js');

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
			if(nextTile.tileType === TILETYPES.LAND) {
				return DIRECTION.E;
			}
		}
		if(tile.x > this.end.x) {
			let nextTile = await this.map.getLoc(tile.x - 1, tile.y);
			if(nextTile.tileType === TILETYPES.LAND) {
				return DIRECTION.W;
			}
		}
		if(tile.y < this.end.y) {
			let nextTile = await this.map.getLoc(tile.x, tile.y + 1);
			if(nextTile.tileType === TILETYPES.LAND) {
				return DIRECTION.N;
			}
		}
		if(tile.y > this.end.y) {
			let nextTile = await this.map.getLoc(tile.x, tile.y - 1);
			if(nextTile.tileType === TILETYPES.LAND) {
				return DIRECTION.S;
			}
		}
		return DIRECTION.C;
	}
}

module.exports = SimplePath;
