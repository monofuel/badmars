//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');

var TILETYPE = require('../map/tiletypes.js');
var DIRECTION = require('../map/directions.js');

class AStarPath {
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

    this.cost = 0;
    this.path = [];
  }
  generate() {
    var self = this;
    var openPromises = [
      this.map.getLoc(this.start.x + 1, this.start.y),
      this.map.getLoc(this.start.x - 1, this.start.y),
      this.map.getLoc(this.start.x, this.start.y + 1),
      this.map.getLoc(this.start.x, this.start.y - 1)
    ];
    return Promise.all(openPromises).then((open) => {
      var closed = [self.start];
      for (var tile of open) {
        tile.cost = 1 + tile.distance(self.end);
        tile.realCost = 1;
        tile.prev = self.start;
      }
      return self.repeatUntilDone();
    });
  }

  //oh god this is ugly
  //at least it works?
  //TODO re-do this  more elegant
  repeatUntilDone() {
    var self = this;
    return self.getNext().then((result) => {
      if (result === 'complete') {
        return;
      }
      return self.repeatUntilDone();
    }).catch(() => {
      return self.repeatUntilDone();
    });
  }


  getNext() {
    var self = this;
    return new Promise((resolve,reject) => {
      self.cost++;
      if (self.cost > 2000) {
        console.log("path complexity exceeded");
        return;
      }

      self.open.sort((a,b) => {
        return a.cost - b.cost;
      });
      self.current = self.open.shift();
      self.closed.push(self.current);

      if (self.current.equals(self.end)) {
        //we're done, save this path
        self.path.push(self.current);
        while (!self.start.equals(self.current)) {
          self.current = self.current.prev;
          self.path.push(self.current);
        }
        console.log("path calculated: " + self.path.length);
        resolve('complete');
      }

      //check if tile is passable
      if (self.current.type != TILETYPE.LAND) {
        reject('not passable');
      }
      //check if there are units on the tile
      return self.map.getUnitAtLoc(self.current);
    }).then((unitAtLoc) => {
      if (unitAtLoc && !unitAtLoc.ghosting) {
        throw new Error('unit exists');
      }
      var neigborPromises = [
        self.current.N(),
        self.current.S(),
        self.current.W(),
        self.current.E()
      ];
      return Promise.all(neighborPromises);
    }).then((neighbors) => {
      for (var tile of neighbors) {
        if (contains(self.closed,tile)) {
          continue;
        }
        tile.cost = self.current.realCost + tile.distance(self.end);
        tile.realCost = self.current.realCost + 1;
        tile.prev = self.current;
        if (!contains(self.open,tile)) {
          self.open.push(tile);
        }
      }
      return 'continue';
    });
  }

  save() {
    //TODO implement this
  }
}

function contains(list,tile) {
  for (let item of list) {
    if (item.equals(tile)) {
      return true;
    }
  }
  return false;
}

module.exports = AStarPath;
