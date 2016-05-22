//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var TILETYPES = require('../map/tiletypes.js');
var DIRECTION = require('../map/directions.js');

class SimplePath {
  constructor(start,end) {
    this.start = start;
    this.end = end;
    if (!this.start || !this.end || this.start.map !== this.end.map) {
      console.log('invalid start and end points');
      console.log(new Error().stack);
      console.log(this.start.toString());
      console.log(this.end.toString());
    }
    this.map = this.start.map;
  }

  //given a tile, find the next one
  getNext(tile) {
    if (tile.x < this.end.tile.x) {
      let nextTile = this.map.getLoc(tile.x + 1, tile.y);
      if (nextTile.type === TILETYPES.LAND) {
        return DIRECTION.E;
      }
    }
    if (tile.x > this.end.tile.x) {
      let nextTile = this.map.getLoc(tile.x - 1, tile.y);
      if (nextTile.type === TILETYPES.LAND) {
        return DIRECTION.W;
      }
    }
    if (tile.y < this.end.tile.y) {
      let nextTile = this.map.getLoc(tile.x, tile.y + 1);
      if (nextTile.type === TILETYPES.LAND) {
        return DIRECTION.N;
      }
    }
    if (tile.y > this.end.tile.y) {
      let nextTile = this.map.getLoc(tile.x, tile.y - 1);
      if (nextTile.type === TILETYPES.LAND) {
        return DIRECTION.S;
      }
    }
    return DIRECTION.C;
  }
}

module.exports = SimplePath;
