/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../db/db.js');
import env from '../config/env';
var logger = require('../util/logger.js');

var TILETYPE = require('../map/tiletypes.js');
var DIRECTION = require('../map/directions.js');

class AStarPath {
	constructor(start, end, unit) {
		this.start = start;
		this.end = end;
		this.unit = unit;
		if(!this.start || !this.end || this.start.map !== this.end.map) {
			console.log('invalid start and end points');
			console.log(new Error().stack);
			console.log(this.start.toString());
			console.log(this.end.toString());
		}
		this.map = this.start.map;

		this.cost = 0;
		this.path = [];
	}
	async generate() {
		this.open = [
      await this.map.getLoc(this.start.x + 1, this.start.y),
      await this.map.getLoc(this.start.x - 1, this.start.y),
      await this.map.getLoc(this.start.x, this.start.y + 1),
      await this.map.getLoc(this.start.x, this.start.y - 1)
    ];

		this.closed = [this.start];
		for(var tile of this.open) {
			tile.cost = 1 + tile.distance(this.end);
			tile.realCost = 1;
			tile.prev = this.start;
		}

		let result;
		do {
			result = await this.searchNext();
			//console.log('result: ', result);
		} while (result !== 'complete');
	}

	async searchNext() {

		this.cost++;

		this.open.sort((a, b) => {
			return a.cost - b.cost;
		});

		if(this.open.length === 0) {
			//save out what we have so far.
			this.path.push(this.current);
			while(!this.start.equals(this.current)) {
				this.current = this.current.prev;
				this.path.push(this.current);
			}
			console.log("complete path calculated: " + this.path.length);

			return 'complete';
		}
		this.current = this.open.shift();
		this.closed.push(this.current);

		if(this.cost > env.pathComplexityLimit) {
			//console.log(this.cost);
			//console.log("path complexity exceeded");

			//save out what we have so far.
			this.path.push(this.current);
			while(!this.start.equals(this.current)) {
				this.current = this.current.prev;
				this.path.push(this.current);
			}
			//console.log("complete path calculated: " + this.path.length);

			return 'complete';
		}

		if(this.current.equals(this.end)) {
			//we're done, save this path
			this.path.push(this.current);
			while(!this.start.equals(this.current)) {
				this.current = this.current.prev;
				this.path.push(this.current);
			}
			//console.log("complete path calculated: " + this.path.length);
			return 'complete';
		}

		//check if the tile is open and passable
		let isValid = await this.map.checkValidForUnit(this.current, this.unit, true);
		if(!isValid) {
			//console.log('not passible for unit');
			return 'continue';
		}

		let neighbors = [
	    await this.current.N(),
	    await this.current.S(),
	    await this.current.W(),
	    await this.current.E()
	  ];

		for(var tile of neighbors) {
			if(contains(this.closed, tile)) {
				continue;
			}
			tile.cost = this.current.realCost + tile.distance(this.end);
			tile.realCost = this.current.realCost + 1;
			tile.prev = this.current;
			if(!contains(this.open, tile)) {
				this.open.push(tile);
			}
		}
		return 'continue';
	}

	save() {
		//TODO implement this
	}

	async getNext(tile) {

		if(tile === null) {
			return DIRECTION.C;
		}
		let nextTile = null;
		for(let i = 0; i < this.path.length; i++) {
			if(tile.equals(this.path[i])) {
				nextTile = this.path[i - 1];
				break;
			}
		}

		if(nextTile === null) {
			return DIRECTION.C;
		}

		if((await tile.E()).equals(nextTile))
			return DIRECTION.E;
		if((await tile.W()).equals(nextTile))
			return DIRECTION.W;
		if((await tile.N()).equals(nextTile))
			return DIRECTION.N;
		if((await tile.S()).equals(nextTile))
			return DIRECTION.S;

		//console.log('invalid next tile');
		return DIRECTION.C;
	}
}

function contains(list, tile) {
	for(let item of list) {
		if(item.equals(tile)) {
			return true;
		}
	}
	return false;
}

module.exports = AStarPath;
