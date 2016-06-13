//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var Chunk = require("../map/chunk.js");
var PlanetLoc = require("./planetloc.js");

var Tiletypes = require('../map/tiletypes.js');
var Unit = require('../unit/unit.js');

var chunkCache = {};

function containsTile(list,tile) {
	for (let item of list) {
		if (item.equals(tile)) {
			return true;
		}
	}
	return false;
}

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

	async getLocFromHash(hash) {
		let x = hash.split(':')[0];
		let y = hash.split(':')[1];
		return await this.getLoc(x,y);
	}

	async getLoc(x, y) {
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


		let chunk = await this.getChunk(chunkX, chunkY);

		return new PlanetLoc(this,chunk, real_x, real_y);
	}

	async spawnUnit(newUnit) {
		//console.log('spawning unit: ' + newUnit.type);
		//console.log('unit tiles: ' + newUnit.tileHash.length);
		for (let tileHash of newUnit.tileHash) {
			if (!await this.checkValidForUnit( await this.getLocFromHash(tileHash),newUnit)) {
				//console.log('attempted to spawn unit where unit exists');
				return false;
			} else {
				//console.log('valid tile for unit: ' + tileHash);
			}
		}
		await db.units[this.name].addUnit(newUnit);
		return true;
	}

	async checkValidForUnit(tile, unit) {

		//TODO handle air and water units
		if (tile.tileType !== Tiletypes.LAND) {
			return false;
		}

		//TODO handle multi tile units properly
		let units = [];
		if (!unit.size || unit.size === 1) {
			 units = await this.unitsTileCheck(await this.getLocFromHash(tile.hash),unit.ghosting);
		} else {
			let tilesToCheck = [
				(tile.x-1) +":" + (tile.y-1), (tile.x) +":" + (tile.y-1), (tile.x+1) +":" + (tile.y-1),
				(tile.x-1) +":" + (tile.y), (tile.x) +":" + (tile.y), (tile.x+1) +":" + (tile.y),
				(tile.x-1) +":" + (tile.y+1), (tile.x) +":" + (tile.y+1), (tile.x+1) +":" + (tile.y+1)
			];
			for (let tileHash of tilesToCheck) {
				let units2 = await this.unitsTileCheck(await this.getLocFromHash(tileHash),unit.ghosting);
				for (let unit2 of units2) {
					units.push(unit2);
				}
			}
		}

		if (unit.type === 'mine') {
			for (let unit2 of units) {
				if (unit2.type !== 'iron' && unit2.type !== 'oil') {
					console.log('mine requires iron or oil');
					return false;
				}
			}
			console.log('found iron or oil for mine');
			return true;
		}

		if (units.length === 0) {
			console.log('no overlapping');
			return true;
		}


		return units.length === 1 && unit.uuid === units[0].uuid;
	}

	async checkOpen(tile) {
		//TODO handle air units
		return (await this.unitsTileCheck(tile, false)).length === 0;
	}

	async unitsTileCheck(tile, includeGhosts) {
		let units = await db.units[this.name].getUnitsAtTile(tile.hash);
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
	}

	async spawnUser(client) {
		//find a spawn location
		let chunk = await this.findSpawnLocation();

		//spawn units for them on the chunk
		let unitsToSpawn = [
			'storage','builder','builder','tank','tank','iron','oil'
		];

		for (let unitType of unitsToSpawn) {
			while (true) {
				let x = this.settings.chunkSize * Math.random();
				let y = this.settings.chunkSize * Math.random();

				x += this.settings.chunkSize * chunk.x;
				y += this.settings.chunkSize * chunk.y;
				x = Math.round(x);
				y = Math.round(y);

				let unit = new Unit(unitType,this,x,y);
				if (unitType !== 'iron' && unitType !== 'oil') {
					unit.owner = client.user.uuid;
				}
				switch (unitType) {
					case 'storage':
						unit.fuel = 1000;
						unit.iron = 1000;
						break;
					case 'tank':
					case 'builder':
						unit.fuel = 50;
						break;
				}

				// https://www.youtube.com/watch?v=eVB8lM-oCSk
				if (await this.spawnUnit(unit)) {
					console.log('spawned ' + unitType + ' for player ' + client.username);
					if (unitType === 'iron' || unitType === 'oil') {
						let mine = new Unit('mine',this,x,y);
						mine.owner = client.user.uuid;
						console.log('spawned mine for player ' + client.username);
						if (! await this.spawnUnit(mine)) {
							console.log('spawning mine failed');
						}
					}
					break;
				} else {
					//unitsToSpawn.push(unitType);
					console.log('unit spawn failed');
				}
			}
		}
		console.log('spawn finished');
	}

	//find random spawn locations, looking farther away depending on how many attempts tried
	//returns a chunk of all free tiles
	async findSpawnLocation(attempts) {
		attempts = attempts || 0;

		var direction = Math.random() * attempts * 50; //100 is a magic number
		var rotation = Math.random() * Math.PI * 2; //random value between 0 and 2PI

		var x = direction * Math.cos(rotation);
		var y = direction * Math.sin(rotation);

		let tile = await this.getLoc(x, y);
		let isValid = await this.validChunkForSpawn(tile.chunk);

		if (isValid) {
			return tile.chunk;
		} else {
			return await this.findSpawnLocation(attempts + 1);
		}
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
			console.log('land tiles: ' + landTiles);
			//only spawn on chunks that are 80% land
			if (landTiles < self.settings.chunkSize * self.settings.chunkSize * 0.8) {
				return false;
			}
			var unitTileChecks = [];
			for (let tile of tiles) {
				unitTileChecks.push(self.checkOpen(tile));
			}
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

	//doot doot

	//tile is the tile to check
	//unit is an optional unit to ignore
	//includeGhosts decide if we should consider ghosts as units
	async getNearestFreeTile(center,unit,includeGhosts) {
		let unitsOnTile = await this.unitsOnTile(center,includeGhosts);

		//check if the tile we are checking is already free
		if (unitsOnTile.length == 0 && center.tileType == Tiletypes.LAND) {
			return center;
		} else {
			//check if the unit is already on this tile
			for (let unit2 of unitsOnTile) {
				if (unit.uuid === unit2.uuid) {
					return center;
				}
			}
		}

		let open = [
			await this.getLoc(center.x + 1, center.y),
			await this.getLoc(center.x - 1, center.y),
			await this.getLoc(center.x, center.y - 1),
			await this.getLoc(center.x, center.y + 1)
		];

		for (let tile of open) {
			tile.cost = tile.distance(center);
		}

		while (true) {
			open.sort((a,b) => {
				return a.cost - b.cost;
			});

			for (let openTile of open) {
				let unitsOnTile = await this.unitsOnTile(openTile,includeGhosts);
				if (unitsOnTile.length !== 0) {
					continue;
				}
				if (openTile.tileType !== Tiletypes.LAND) {
					continue;
				}
				return openTile;
			}

			for (let tile of open) {
				let neighbors = [
					await tile.N(),
					await tile.S(),
					await tile.E(),
					await tile.W()
				];
				for (let neighbor of neighbors) {
					if (containsTile(open,neighbor)) {
						continue;
					}
					neighbor.cost = neighbor.distance(center);
					open.push(neighbor);
				}
			}
		}
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
