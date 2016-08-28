/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var TILETYPES = require('./tiletypes.js');
var DIRECTION = require('../map/directions.js');

import env from '../config/env.js';
import {Map} from './map.js';
import {Chunk} from './chunk.js';

/**
 * Representation of a point on a planet
 */

class PlanetLoc {
  x: number;
  y: number;
  map: Map;
  hash: TileHash;
  chunk: Chunk;
  local_x: number;
  local_y: number;
  tileType: TILETYPES;
  constructor(map: Map,chunk: Chunk,x: number,y: number) {
    if (!map) {
      console.log(this.toString());
      console.log('invalid planetloc');
      console.log(new Error().stack);
    }

    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.map = map;
		this.hash = x + ":" + y;
		this.chunk = chunk;

		this.local_x = this.x - (chunk.x * chunk.chunkSize);
		this.local_y = this.y - (chunk.y * chunk.chunkSize);

		if (this.local_x < 0) {
			this.local_x = this.local_x + chunk.chunkSize;
		}

		if (this.local_y < 0) {
			this.local_y = this.local_y + chunk.chunkSize;
		}


    //console.log("x: " + this.x + ", y: " + this.y + " chunkx: " + this.chunk.x + ", chunky: " + this.chunk.y + " localx: " + this.local_x + " localy: " + this.local_y);

    if (!this.chunk) {
      console.log("tile on not loaded chunk: " + this.x + "," + this.y);
      console.log('chunk hash: ' + chunk.hash);
      return;
    }

		if (this.local_x > this.chunk.navGrid.length || this.local_y > this.chunk.navGrid[0].length) {
			console.log('invalid chunk');
			console.log("x: " + this.x + ", y: " + this.y + " chunkx: " + this.chunk.x + ", chunky: " + this.chunk.y + " localx: " + this.local_x + " localy: " + this.local_y);

			console.log((new Error()).stack);
		}

    this.tileType = this.chunk.navGrid[this.local_x][this.local_y];

  }

  distance(tile) {
    var deltaX = Math.abs(this.x - tile.x);
    var deltaY = Math.abs(this.y - tile.y);

    return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
  }
  toString() {
    var line = "x: " + this.x;
		line += ", y: " + this.y;
		line += ", type: " + TILETYPES.getTypeName(this.tileType);
		if (this.map) {
			line += ", map: " + this.map.name;
		}
		return line;
  }
  async N() {
    return await this.map.getLoc(this.x,this.y + 1);
  }
  async S() {
    return await this.map.getLoc(this.x,this.y - 1);
  }
  async E() {
    return await this.map.getLoc(this.x + 1,this.y);
  }
  async W() {
    return await this.map.getLoc(this.x - 1,this.y);
  }

	async getDirTile(dir) {
		switch(dir) {
			case DIRECTION.N:
				return await this.N();
			case DIRECTION.S:
				return await this.S();
			case DIRECTION.E:
				return await this.E();
			case DIRECTION.W:
				return await this.W();
			case DIRECTION.C:
			default:
				return this;
		}

	}

  async validate() {
    if (!env.debug) {
      return;
    }
    const invalid = (reason) => {
      throw new Error(this.hash + ': ' + reason);
    }
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
    if (this.local_x == null) {
      invalid('bad local x');
    }
    if (this.local_y == null) {
      invalid('bad local y');
    }
    if (this.tileType == null) {
      invalid('bad tile type');
    }


  }

  equals(otherLoc) {
		if (!otherLoc || !otherLoc.map) return false;
    return (otherLoc.x === this.x &&
			otherLoc.y === this.y &&
			otherLoc.map.name === this.map.name);
  }
}

module.exports = PlanetLoc;
