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

    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.map = map;
    this.chunk = chunk;

    console.log("x: " + this.x + ", y: " + this.y + "chunkx: " + this.chunkX + ", chunky: " + this.chunkY);

    if (!this.chunk) {
      console.log("tile on not loaded chunk: " + this.x + "," + this.y);
      console.log('chunk hash: ' + chunkX + ":" + chunkY);
      return;
    }

    this.tileType = this.chunk.navGrid[this.x][this.y];

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
  N() {
    return this.map.getLoc(this.x,this.y + 1);
  }
  S() {
    return this.map.getLoc(this.x,this.y - 1);
  }
  E() {
    return this.map.getLoc(this.x + 1,this.y);
  }
  W() {
    return this.map.getLoc(this.x - 1,this.y);
  }

  equals(otherLoc) {
    return (otherLoc.x === this.x &&
			otherLoc.y === this.y &&
			otherLoc.map.name === this.map.name);
  }
}

module.exports = PlanetLoc;
