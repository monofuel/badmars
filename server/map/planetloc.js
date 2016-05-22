//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var TILETYPES = require('./tiletypes.js');

/**
 * Representation of a point on a planet
 */

class PlanetLoc {
  constructor(map,chunk,x,y) {
    if (!map) {
      console.log(this.toString());
      console.log('invalid planetloc');
      console.log(new Error().stack);
    }

    this.real_x = Math.floor(x);
    this.real_y = Math.floor(y);
    this.map = map;
    this.chunk = chunk;

    this.x = this.real_x - (chunk.x * map.settings.chunkSize);
    this.y = this.real_y - (chunk.y * map.settings.chunkSize);

    console.log("x: " + this.real_x + ", y: " + this.real_y + "chunkx: " + this.chunkX + ", chunky: " + this.chunkY);

    if (!this.chunk) {
      console.log("tile on not loaded chunk: " + this.real_x + "," + this.real_y);
      console.log('chunk hash: ' + chunkX + ":" + chunkY);
      return;
    }

    this.tileType = this.chunk.navGrid[this.x][this.y];

  }

  distance(tile) {
    var deltaX = Math.abs(this.real_x - tile.real_x);
    var deltaY = Math.abs(this.real_y - tile.real_y);

    return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
  }
  toString() {
    var line = "x: " + this.real_x;
		line += ", y: " + this.real_y;
		line += ", type: " + TILETYPES.getTypeName(this.tileType);
		if (this.map) {
			line += ", map: " + this.map.name;
		}
		return line;
  }
  N() {
    return this.map.getLoc(this.real_x,this.real_y + 1);
  }
  S() {
    return this.map.getLoc(this.real_x,this.real_y - 1);
  }
  E() {
    return this.map.getLoc(this.real_x + 1,this.real_y);
  }
  W() {
    return this.map.getLoc(this.real_x - 1,this.real_y);
  }

  equals(otherLoc) {
    return (otherLoc.real_x === this.real_x &&
			otherLoc.real_y === this.real_y &&
			otherLoc.map.name === this.map.name);
  }
}

module.exports = PlanetLoc;
