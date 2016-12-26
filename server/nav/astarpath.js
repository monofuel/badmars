/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Map from '../map/map';
import PlanetLoc from '../map/planetloc';
import Unit from '../unit/unit';

import DIRECTION from '../map/directions';

class AStarPath {
	start: PlanetLoc;
	end: PlanetLoc;
	current: PlanetLoc;
	unit: Unit;
	map: Map;
	cost: number;
	path: Array < PlanetLoc > ;
	open: Array < PlanetLoc > ;
	closed: Array < PlanetLoc > ;

	constructor(start: PlanetLoc, end: PlanetLoc, unit: Unit) {
		this.start = start;
		this.end = end;
		this.unit = unit;
		if(!this.start || !this.end || this.start.map !== this.end.map) {
			return logger.errorWithInfo('invalid start and end points', {
				start: start,
				end: end,
				unit: unit
			})
		}
		this.current = start;
		this.map = this.start.map;
		this.current = this.start;

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
				if(!this.current.prev) {
					throw new Error('bad pathfinder state, no previous tile');
				}
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
				if(!this.current.prev) {
					throw new Error('bad pathfinder state, no previous tile');
				}
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
