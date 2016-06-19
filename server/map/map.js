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
	async factoryMakeUnit(unitType,owner,x,y) {
		let newUnit = new Unit(unitType, this, x, y);
		newUnit.owner = owner;
		newUnit.ghosting = false;
		return await this.spawnUnit(newUnit);
	}

	async spawnUnit(newUnit) {
		console.log('spawning unit: ' + newUnit.type);
		console.log('unit tiles: ' + newUnit.tileHash.length);
		for (let tileHash of newUnit.tileHash) {
			if (!await this.checkValidForUnit( await this.getLocFromHash(tileHash),newUnit)) {
				return false;
			} else {
				//console.log('valid tile for unit: ' + tileHash);
			}
		}
		return await db.units[this.name].addUnit(newUnit);
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
			console.log('checking mine');
			let resource = false;
			for (let unit2 of units) {
				if (unit2.type === 'iron' || unit2.type === 'oil') {
					console.log('found resource');
					resource = true;
				}
				//already has a mine
				if (unit2.type === 'mine') {
					return false;
				}
			}

			//console.log('found iron or oil for mine');
			return resource;
		}

		if (units.length === 0) {
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

		/*for (let i = 0; i < 50; i++) {
			unitsToSpawn.push('tank');
		}*/

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

	async getNearbyUnitsFromChunk(chunkHash,chunkRange) {
		let chunkHashes = await this.getNearbyChunkHashes(chunkHash,chunkRange);
		return await this.getUnitsAtChunks(chunkHashes);
	}

	async getUnitsAtChunks(chunkHashes) {
		let units = [];
		for (let chunkHash of chunkHashes) {
			let x = chunkHash.split(':')[0];
			let y = chunkHash.split(':')[1];
			let chunk = await this.getChunk(x,y);
			let chunkUnits = await chunk.getUnits();
			for (let unit of chunkUnits) {
				units.push(unit);
			}
		}
		return units;
	}

	getNearbyChunkHashes(chunkHash, range) {
		let x = parseInt(chunkHash.split(':')[0]);
		let y = parseInt(chunkHash.split(':')[1]);

		var chunks = [];
		for (let i = -range; i < range; i++) {
			for (let j = -range; j < range; j++) {
				if (Math.sqrt(i * i + j * j) < range) {
					let chunkX = x + i;
					let chunkY = y + j;
					chunks.push(chunkX + ":" + chunkY);
				}
			}
		}
		return chunks;

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

	async pullIron(taker, amount) {
		console.log('pulling iron');
		//TODO 3 is a magic number- should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(taker.chunkHash[0],2);
		//TODO should sort buildings over units
		this.sortByNearestUnit(units,taker);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			amountCanPull += unit.iron;
			if (amountCanPull > amount) {
				break;
			}
		}
		if (amountCanPull < amount) {
			return false;
		}

		let pulledMap = {};
		//actually pull iron
		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			let pulled = Math.min(unit.iron,amount);
			if (pulled === 0) {
				continue;
			}
			console.log('pulling: ' + pulled);
			let success = await unit.takeIron(pulled);
			console.log('success: ' + success + ' : ' + pulled);
			if (success) {
				pulledMap[unit.uuid] = pulled;
				console.log('pulled :' + pulled);
				amount = amount - pulled;
				if (amount <= 0) {
					break;
				}
			}
		}

		//if amount is still greater than 0
		//that means the amount of iron changed after checking,
		//and we should put iron back
		if (amount > 0 && Object.keys(pulledMap).length > 0) {
			console.log('failed, restoring iron:');
			console.log(pulledMap);
			for (let unit of units) {
				if (pulledMap[unit.uuid]) {
					await unit.addIron(pulledMap[unit.uuid]);
				}
			}
			return false;
		}

		console.log('pulled iron');
		return true;
	}

	async pullFuel(taker, amount) {
		console.log('pulling iron');
		//TODO 3 is a magic number- should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(taker.chunkHash[0],2);
		//TODO should sort buildings over units
		this.sortByNearestUnit(units,taker);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			amountCanPull += unit.fuel;
			if (amountCanPull > amount) {
				break;
			}
		}
		if (amountCanPull < amount) {
			return false;
		}

		let pulledMap = {};
		//actually pull iron
		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			let pulled = Math.min(unit.iron,amount);
			if (pulled === 0) {
				continue;
			}
			let success = await unit.takeFuel(pulled);
			if (success) {
				pulledMap[unit.uuid] = pulled;
				console.log('pulled :' + pulled);
				amount = amount - pulled;
				if (amount <= 0) {
					break;
				}
			}
		}

		//if amount is still greater than 0
		//that means the amount of iron changed after checking,
		//and we should put iron back
		for (let unit of Object.keys(pulledMap)) {
			console.log('failed, restoring fuel:');
			await unit.addFuel(pulledMap[unit.uuid]);
			return false;
		}

		console.log('pulled fuel');
		return true;
	}

	async produceIron(mine, amount) {

		//TODO 3 is a magic number- should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(mine.chunkHash[0],2);
		this.sortByNearestUnit(units,mine);

		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.movementType !== 'building') {
				continue;
			}
			let deposited = await unit.addIron(amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
		}
	}

	async produceFuel(mine, amount) {
		//TODO 3 is a magic number- should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(mine.chunkHash[0],2);
		this.sortByNearestUnit(units,mine);

		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.movementType !== 'building') {
				continue;
			}
			let deposited = await unit.addFuel(amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
		}

	}

	sortByNearestUnit(units, unit) {
		units.sort((a,b) => {
			return a.distance(unit) - b.distance(unit);
		});
	}

	//doot doot

	//tile is the tile to check
	//unit is an optional unit to ignore
	//includeGhosts decide if we should consider ghosts as units
	async getNearestFreeTile(center,unit,includeGhosts) {
		let unitsOnTile = await this.unitsTileCheck(center,includeGhosts);

		//check if the tile we are checking is already free
		if (unitsOnTile.length == 0 && center.tileType == Tiletypes.LAND) {
			return center;
		} else {
			//check if the unit is already on this tile
			if (unit) {
				for (let unit2 of unitsOnTile) {
					if (unit.uuid === unit2.uuid) {
						return center;
					}
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
		let closed = [];
		let newOpened = [];
		while (true) {
			for (let newOpen of newOpened) {
				open.push(newOpen);
			}
			newOpened = [];

			open.sort((a,b) => {
				return a.cost - b.cost;
			});
			console.log('OPEN TILES',open.length);
			for (let openTile of open) {
				if (containsTile(closed,openTile)) {
					continue;
				}
				let unitsOnTile = await this.unitsTileCheck(openTile,includeGhosts);
				if (unitsOnTile.length !== 0) {
					closed.push(openTile);
					continue;
				}
				if (openTile.tileType !== Tiletypes.LAND) {
					closed.push(openTile);
					continue;
				}
				return openTile;
			}
			console.log('ADDING NEW OPEN TILES');
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
					newOpened.push(neighbor);
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
