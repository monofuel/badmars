//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var Chunk = require("../map/chunk.js");
var PlanetLoc = require("./planetloc.js");

var Tiletypes = require('../map/tiletypes.js');

var chunkCache = {};

class Map {
	constructor(name) {
		this.name = name;
		if (name && !chunkCache[name]) {
			chunkCache[name] = {};
		}
		this.settings = {
			chunkSize: 16,
			waterHeight: 6.4,
			cliffDelta: 0.3,
			water: true,
			bigNoise: 0.07,
			medNoise: 0.24,
			smallNoise: 0.53,
			bigNoiseScale: 1.8,
			medNoiseScale: 0.25,
			smallNoiseScale: 0.25,
			ironChance: 0.003,
			oilChance: 0.002
		};
		this.lastTickTimestamp = (new Date()).getTime();
		this.lastTick = 0;
		this.users = [];
		this.seed = Math.random();
	}
	getChunk(x, y) {
		var self = this;
		var hash = x + ":" + y;
		if (chunkCache[this.name][hash]) {
			return new Promise.resolve(chunkCache[this.name][hash]);
		}
		return db.chunks[this.name].getChunk(x, y).then((chunk) => {
			if (!chunk || !chunk.isValid()) {
				chunk = new Chunk(x, y, self.name);
				return chunk.save().then(() => {
					return chunk;
				});
			} else {
				return chunk;
			}
		});
	}

	getLoc(x, y) {
		var self = this;
		var real_x = Math.floor(x);
		var real_y = Math.floor(y);
		var chunkX = Math.floor(real_x / this.settings.chunkSize);
		var chunkY = Math.floor(real_y / this.settings.chunkSize);
		var local_x = real_x - (chunkX * this.settings.chunkSize);
		var local_y = real_y - (chunkY * this.settings.chunkSize);
		if (local_x < 0) {
			local_x += this.settings.chunkSize;
			chunkX--;
		}
		if (local_y < 0) {
			local_y += this.settings.chunkSize;
			chunkY--;
		}
		//console.log("real: " + real_x + ":" + real_y);
		//console.log("chunk: " + chunkX + ":" + chunkY);
		//console.log("local: " + local_x + ":" + local_y);


		return self.getChunk(chunkX, chunkY).then((chunk) => {
			return new PlanetLoc(self,chunk, real_x, real_y);
		});
	}

	spawnUnit(newUnit) {
		//TODO check if valid for unit
		//since some units are multi-tile, and mines can be on iron/oil
		db.units[this.name].getUnitAtTile(newUnit.tileHash).then((unit) => {
			if (unit) {
				console.log('attempted to spawn unit where unit exists');
				return;
			}
			db.units[this.name].addUnit(newUnit);
		});
	}

	checkValidForUnit(tile, unit) {

		var tilePromises = [];
		for (let tileHash of unit.tileHash) {

		}
		return Promise.all(tilePromises).then((units) => {
			var overlapping = [];

			if (unit.ghosting) {
				//unit construction
				if (unit.type == 'mine') {
					for (let unit2 of units) {
						if (unit2.type !== 'iron' && unit2.type !== 'oil') {
							return false;
						}
					}
					return true;
				} else {
					//TODO handle the construction of air units
					return units.length == 0;
				}
			} else {
				//unit movement
				//TODO handle flying units
				for (let unit2 of units) {
					if (!unit2.ghosting) {
						return false;
					}
				}
				return true;
			}
		});
	}

	checkOpen(tile) {
		return this.unitsTileCheck(tile, false).then((units) => {
			return units.length === 0;
		})
	}

	unitsTileCheck(tile, includeGhosts) {
		return db.units[this.name].getUnitsAtTile(tile.hash).then((units) => {
			if (!includeGhosts) {
				var unitsToReturn = [];
				for (let unit of units) {
					if (!unit.ghosting) {
						unitsToReturn.push(unit);
					}
				}
				return unitsToReturn;
			} else {
				return units;
			}
		});
	}

	spawnUser(client) {
		//find a spawn location
		return this.findSpawnLocation().then((chunk) => {
			//spawn units for them on the chunk
			var unitPromises = [];

			//return a promise that returns all the units
			return Promise.all(unitPromises);
		});





		/* //old code
		thisPlanet = this;
	    return new Promise((resolve,reject) ->
	      db.getUserById(userId).then((playerInfo) ->
	        thisPlanet.players.push(playerInfo)
	        for player in thisPlanet.players
	          Net.sendMessage(player,{ type: 'players', players: thisPlanet.players});

	      ).then(() ->
	        goodArea = false
	        while (!goodArea)
	          x = Math.random() * (thisPlanet.worldSettings.size - 10);
	          y = Math.random() * (thisPlanet.worldSettings.size - 10);

	          console.log('scanning for potential spawn')
	          goodArea = true
	          for x2 in [0..6]
	            for y2 in [0..6]
	              tile = new PlanetLoc(thisPlanet,x + x2, y + y2)
	              if (tile.type != TileType.land)
	                goodArea = false
	                break
	              if (Units.unitTileCheck(tile))
	                goodArea = false
	                break
	            if (!goodArea)
	              break
	          if (!goodArea)
	            continue
	        console.log('found a good area to spawn')
	        buildings = [
	          thisPlanet.createUnit('storage',new PlanetLoc(thisPlanet,x + 3, y + 3),userId),
	          thisPlanet.createUnit('builder',new PlanetLoc(thisPlanet,x + 1, y + 2),userId),
	          thisPlanet.createUnit('builder',new PlanetLoc(thisPlanet,x + 1, y + 3),userId),
	          thisPlanet.createUnit('tank',new PlanetLoc(thisPlanet,x + 5, y + 2),userId),
	          thisPlanet.createUnit('tank',new PlanetLoc(thisPlanet,x + 5, y + 3),userId),
	          thisPlanet.createUnit('iron',new PlanetLoc(thisPlanet,x, y),userId),
	          thisPlanet.createUnit('oil',new PlanetLoc(thisPlanet,x + 5, y + 5),userId),
	          thisPlanet.createUnit('mine',new PlanetLoc(thisPlanet,x, y),userId),
	          thisPlanet.createUnit('mine',new PlanetLoc(thisPlanet,x + 5, y + 5),userId),
	        ]
	        Promise.all(buildings).then( (units) ->
	          for unit in units
	            switch(unit.type)
	              when 'storage'
	                unit.iron = 1000
	                unit.oil = 1000
	              when 'tank'
	                unit.oil = 50
	              when 'builder'
	                unit.oil = 50
	            unit.save()
	          console.log('spawning finished')
	          resolve();
	        )
	      )
	    )
		*/
	}

	//find random spawn locations, looking farther away depending on how many attempts tried
	//returns a chunk of all free tiles
	findSpawnLocation(attempts) {
		attempts = attempts || 0;

		var direction = Math.random() * attempts * 50; //100 is a magic number
		var rotation = Math.random() * Math.PI * 2; //random value between 0 and 2PI

		var x = direction * Math.cos(rotation);
		var y = direction * Math.sin(rotation);

		var self = this;

		return this.getLoc(x, y).then((tile) => {
			return self.validChunkForSpawn(tile.chunk);
		}).then((isValid, chunk) => {
			if (isValid) {
				return chunk;
			} else {
				return self.findSpawnLocation(attempts + 1);
			}
		})
	}


	//TODO this function could use some love to be a bit more sane about spawning
	validChunkForSpawn(chunk) {
		var self = this;
		return chunk.getTiles().then((tiles) => {
			console.log('checking tile types');
			var landTiles = 0;
			for (let tile of tiles) {
				if (tile.tileType === Tiletypes.LAND) {
					landTiles++;
				}
			}
			//only spawn on chunks that are 80% land
			if (landTiles < self.settings.chunkSize * self.settings.chunkSize * 0.2) {
				return false;
			}
			var unitTileChecks = [];
			for (let tile of tiles) {
				unitTileChecks.push(self.checkOpen(tile));
			}
			console.log(unitTileChecks.length);
			return Promise.all(unitTileChecks).then((tileChecks) => {
				for (let valid of tileChecks) {
					if (!valid) {
						return false;
					}
				}
				console.log('found valid chunk for spawn');
				return true;
			});
		});
	}

	pullIron(unit, amount) {
		return true;
		/* //old code
		tile = builder.tile
	    units = this.getPlayersUnitsSync(builder.owner)
	    nearest = []
	    for unit in units
	      unitInfo = Units.get(unit.type)
	      if (!unitInfo)
	        continue
	      if (unit._id == builder._id)
	        continue;
	      if (unit.ghosting)
	        continue
	      delta = builder.tile.distance(unit.tile)
	      #console.log("nearby unit type " + unit.type + " with iron: " + unit.iron + " and oil " + unit.oil)
	      if (delta < unitInfo.transferRange && unit.iron > 0)
	        nearest.push(unit)

	    nearest.sort((a,b) ->
	      return a.tile.distance(builder.tile) - b.tile.distance(builder.tile)
	    )

	    #see if there are enough resources nearby
	    ironTotal = 0
	    for unit in nearest

	      ironTotal += unit.iron
	    #console.log("total iron nearby: " + ironTotal)

	    if (ironTotal < amount)
	      return false

	    for unit in nearest
	      if (unit.iron < amount)
	        amount -= unit.iron
	        unit.iron = 0
	      else
	        unit.iron -= amount
	        amount = 0
	        break
	    return true
		*/
	}

	pullOil(unit, amount) {
		return true;
		//TODO same as iron but for oil
	}

	produceIron(unit, amount) {
		/* // old code
		tile = mine.tile
	    units = this.getPlayersUnitsSync(mine.owner)
	    nearest = []
	    for unit in units
	      unitInfo = Units.get(unit.type)
	      if (!unitInfo)
	        continue
	      if (unit._id == mine._id)
	        continue
	      if (unitInfo.movementType != 'building')
	        continue
	      if (unit.ghosting)
	        continue

	      delta = mine.tile.distance(unit.tile)
	      #console.log("nearby unit type " + unit.type + " with iron: " + unit.iron + " and oil " + unit.oil)
	      if (delta < unitInfo.transferRange && unit.iron < unitInfo.maxStorage / 2)
	        nearest.push(unit)

	    nearest.sort((a,b) ->
	      return a.tile.distance(mine.tile) - b.tile.distance(mine.tile)
	    )

	    for unit in nearest
	      unitInfo = Units.get(unit.type)
	      #divide by 2 as we want a 50/50 iron oil split
	      if ((unitInfo.maxStorage / 2) - unit.iron < amount)
	        delta = (unitInfo.maxStorage / 2) - unit.iron
	        amount -= delta
	        unit.iron += delta
	      else
	        unit.iron += amount
	        amount = 0
	      this.broadcastUpdate({
	        type: "updateUnits"
	        units: [unit]
	        success: true
	        });

	    if (amount > 0)
	      freeStorage = unitInfo.maxStorage - (mine.iron + mine.oil)
	      mine.iron += Math.min(freeStorage,amount)
	    this.broadcastUpdate({
	      type: "updateUnits"
	      units: [mine]
	      success: true
	      });
	    return true
		*/
	}

	produceOil(unit, amount) {

		//same as iron, but with oil

	}

	getNearestFreeTile(tile) {
		/* //old code

		    unitOnTile = (this.unitTileCheck(center,includeGhosts))
		    if ((!unitOnTile || unit == unitOnTile) && center.type == TileType.land)
		      return center

		    open = [
		      new PlanetLoc(this,center.x+1, center.y)
		      new PlanetLoc(this,center.x-1, center.y)
		      new PlanetLoc(this,center.x, center.y-1)
		      new PlanetLoc(this,center.x, center.y+1)
		    ]

		    for tile in open
		      tile.cost = center.distance(tile)

		    while (true)

		      open.sort((a,b) ->
		        return a.cost - b.cost
		      )

		      for openTile in open
		        unitOnTile = (this.unitTileCheck(openTile,includeGhosts))
		        if (unitOnTile && unitOnTile != unit)
		          continue

		        if (openTile.type != TileType.land)
		          continue
		        return openTile

		      for tile in open
		        neighbors = [
		          tile.N()
		          tile.S()
		          tile.E()
		          tile.W()
		        ]

		        for neighbor in neighbors
		          if (@contains(open,neighbor))
		            continue
		          neighbor.cost = neighbor.distance(center)
		          open.push(neighbor)
				  */
	}

	getNearestEnemy(unit) {
		/* //old code
		#assume all users are enemies.
	    #TODO faction or enemy/ally system thing
	    distance = null
	    nearestEnemy = null
	    for otherUnit in @units
	      if (otherUnit.owner != unit.owner && otherUnit.type != 'oil' && otherUnit.type != 'iron' && !otherUnit.ghosting)
	        otherUnitDistance = unit.tile.distance(otherUnit.tile);
	        if (!nearestEnemy || otherUnitDistance < distance)
	          nearestEnemy = otherUnit
	          distance = otherUnitDistance

	    return nearestEnemy
		*/
	}

	getNearestGhost(unit) {
		//similar to get nearest enemy
	}

	save() {
		return db.map.saveMap(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
		this.settings = {
			chunkSize: 16,
			waterHeight: 0,
			cliffDelta: 0.4,
			water: true,
			bigNoise: 0.005,
			medNoise: 0.04,
			smallNoise: 0.1,
			bigNoiseScale: 15,
			medNoiseScale: 3,
			smallNoiseScale: 1,
			ironChance: 0.003,
			oilChance: 0.002
		};
	}
}

module.exports = Map;
