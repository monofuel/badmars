/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const _ = require('lodash');
const db = require('../db/db.js');
const logger = require('../util/logger.js');
const helper = require('../util/helper.js');
const env = require('../config/env.js');
import {Chunk} from './chunk.js';
const PlanetLoc = require("./planetloc.js");

const Tiletypes = require('../map/tiletypes.js');
const Unit = require('../unit/unit.js');

const grpc = require('grpc');

const mapService = grpc.load(__dirname + '/../protos/map.proto').map;
const mapClient = new mapService.Map(env.mapHost + ':' + env.mapPort, grpc.credentials.createInsecure());

const defaultSettings = {
	chunkSize: 8,
	waterHeight: 0,
	cliffDelta: 0.4,
	water: true,
	bigNoise: 0.005,
	medNoise: 0.04,
	smallNoise: 0.1,
	bigNoiseScale: 15,
	medNoiseScale: 3,
	smallNoiseScale: 1,
	ironChance: 0.002,
	oilChance: 0.0015
};

function containsTile(list,tile) {
	for (let item of list) {
		if (item.equals(tile)) {
			return true;
		}
	}
	return false;
}

type CacheChunk = {
	chunk: Chunk,
	timestamp: number
};
type ChunkCacheMap = {
	[key: string]: CacheChunk;
}

export class Map {
	name: string;
	settings: Object;
	lastTickTimestamp: number;
	lastTick: number;
	users: Array<any>;
	seed: number;
	chunkCache: Array<CacheChunk>;
	chunkCacheMap: ChunkCacheMap;

	constructor(name: string) {
		this.name = name;
		this.settings = _.cloneDeep(defaultSettings);
		this.lastTickTimestamp = (new Date()).getTime();
		this.lastTick = 0;
		this.users = [];
		this.seed = Math.random();
		this.chunkCache = [];
		this.chunkCacheMap = {};
	}

	async getChunk(x, y) {
		x = parseInt(x);
		y = parseInt(y);
		const self = this;

		logger.addAverageStat('chunkCacheSize',this.chunkCache.length);
		let cacheChunk = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			logger.addSumStat('cacheChunkHit',1);
			return cacheChunk;
		} else {
			logger.addSumStat('cacheChunkMiss',1);
		}

		return await new Promise((resolve,reject) => {
			let profile = logger.startProfile('getChunk');
			return mapClient.getChunk({mapName: this.name,x,y},(err: Error,response: ChunkProto) => {
				logger.endProfile(profile);
				if (err) {
					logger.error(err);
					return reject(err);
				}
				let chunk = new Chunk();
				chunk.clone(response);
				for (let i = 0; i < chunk.navGrid.length; i++) {
					chunk.navGrid[i] = response.navGrid[i].items;
				}
				for (let i = 0; i < chunk.grid.length; i++) {
					chunk.grid[i] = response.grid[i].items;
				}
				this.addChunkToCache(chunk);
				chunk.validate();
				resolve(chunk);
			});
		}).catch((err) => {
			console.log('failed to get chunk, retrying');
			helper.sleep(50);
			return self.getChunk(x,y);
		});
	}

	async fetchOrGenChunk(x,y) {

		logger.addAverageStat('chunkCacheSize',this.chunkCache.length);
		let cacheChunk = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			logger.addSumStat('cacheChunkHit',1);
			return cacheChunk;
		} else {
			logger.addSumStat('cacheChunkMiss',1);
		}
		let chunk = await db.chunks[this.name].getChunk(x, y);

		if (!chunk || !chunk.isValid()) {
			logger.addSumStat('generatingChunk',1);
			chunk = new Chunk(x, y, this.name);
			await chunk.save();
		}
		this.addChunkToCache(chunk);
		return chunk;
	}

	addChunkToCache(chunk) {
		let profile = logger.startProfile('addChunkToCache');
		let entry = {
			chunk,
			timestamp: Date.now()
		}

		//clear old entries from cache
		while (this.chunkCache.length > env.chunkCacheLimit) {
			let oldChunk = this.chunkCache.shift();
			delete this.chunkCacheMap[oldChunk.chunk.hash];
		}
		this.chunkCache.push(entry);
		this.chunkCacheMap[chunk.hash] = chunk;

		//sort latest to oldest
		this.chunkCache.sort((a,b) => {
			return b.timestamp - a.timestamp
		});
		logger.endProfile(profile);
	}

	getChunkFromCache(hash) {
		return this.chunkCacheMap[hash];
	}

	async getLocFromHash(hash) {
		let x = hash.split(':')[0];
		let y = hash.split(':')[1];
		return await this.getLoc(x,y);
	}

	async getLoc(x, y): Promise<PlanetLoc> {
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

		console.log('getting chunk');
		let chunk = await this.getChunk(chunkX, chunkY);
		console.log('asdadf');

		return new PlanetLoc(this,chunk, real_x, real_y);
	}
	async factoryMakeUnit(unitType,owner,x,y) {
		let newUnit = new Unit(unitType, this, x, y);
		newUnit.owner = owner;
		newUnit.ghosting = false;
		return await this.spawnUnit(newUnit);
	}

	async spawnUnit(newUnit:Unit):Promise<?Unit> {
		console.log('spawning unit: ' + newUnit.type);
		for (let tileHash of newUnit.tileHash) {
			if (!await this.checkValidForUnit( await newUnit.getLoc(),newUnit)) {
				return null;
			} else {
				//console.log('valid tile for unit: ' + tileHash);
			}
		}
		return this.spawnAndValidate(newUnit);
	}

	async spawnUnitWithoutTileCheck(newUnit: Unit): Promise<Unit> {
		console.log('force spawning unit: ' + newUnit.type);
		return this.spawnAndValidate(newUnit);
	}
	async spawnAndValidate(newUnit:Unit):Promise<Unit> {
		const unit = await db.units[this.name].addUnit(newUnit);
		await unit.addToChunks();
		await unit.validate();
		return unit;
	}

	async checkValidForUnit(tile, unit,ignoreAwake) {
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

		if (units.length === 1 && unit.uuid === units[0].uuid) {
			return true;
		}

		if (ignoreAwake) {
			for (let unit of units) {
				if (!unit.awake && unit.movementType === 'groundUnit') {
					return true;
				}
			}
			return false;
		}

		return false;
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

	async getNearbyUnitsFromChunkWithTileRange(chunkHash,tileRange) {
		let chunkRange = tileRange / this.settings.chunkSize;
		return await this.getNearbyUnitsFromChunk(chunkHash,chunkRange);
	}

	async getNearbyUnitsFromChunk(chunkHash,chunkRange) {
		if (!chunkRange) {
			chunkRange = env.chunkExamineRange;
		}
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

	getNearbyChunkHashes(chunkHash: string, range: number) {
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
	async validChunkForSpawn(chunk) {
		var self = this;

		let nearbyUnits = await this.getNearbyUnitsFromChunkWithTileRange(chunk.hash,128);
		for (let unit of nearbyUnits) {
			if (unit.owner !== "") {
				return false;
			}
		}


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
		let units = await this.getNearbyUnitsFromChunk(taker.chunkHash[0]);
		//TODO should sort buildings over units
		this.sortByNearestUnit(units,taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.owner !== taker.owner) {
				continue;
			}
			let distance = unit.distance(taker);
			if (distance > unit.transferRange && distance > taker.transferRange) {
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
		let units = await this.getNearbyUnitsFromChunk(taker.chunkHash[0]);
		//TODO should sort buildings over units
		this.sortByNearestUnit(units,taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.owner !== taker.owner) {
				continue;
			}
			let distance = unit.distance(taker);
			if (distance > unit.transferRange && distance > taker.transferRange) {
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
		//TODO refactor this
		/*
		for (let uuid of Object.keys(pulledMap)) {
			console.log('failed, restoring fuel:');
			await unit.addFuel(pulledMap[unit.uuid]);
			return false;
		}*/

		console.log('pulled fuel');
		return true;
	}

	async produceIron(mine, amount) {

		//TODO 3 is a magic number- should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(mine.chunkHash[0]);
		this.sortByNearestUnit(units,mine);
		this.sortBuildingsOverOther(units);

		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.owner !== mine.owner) {
				continue;
			}
			if (mine.uuid === unit.uuid) {
				continue;
			}
			if (unit.movementType !== 'building') {
				continue;
			}
			let distance = unit.distance(mine);
			if (distance > unit.transferRange && distance > mine.transferRange) {
				continue;
			}
			let deposited = await unit.addIron(amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
		}
		if (amount > 0) {
			console.log('depositing iron into mine',amount);
			await mine.addIron(amount);
		}
	}

	async produceFuel(mine, amount) {
		//TODO 3 is a magic number- should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(mine.chunkHash[0]);
		this.sortByNearestUnit(units,mine);
		this.sortBuildingsOverOther(units);

		for (let unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.owner !== mine.owner) {
				continue;
			}
			if (mine.uuid === unit.uuid) {
				continue;
			}
			if (unit.movementType !== 'building') {
				continue;
			}
			let distance = unit.distance(mine);
			if (distance > unit.transferRange && distance > mine.transferRange) {
				continue;
			}
			let deposited = await unit.addFuel(amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
			if (amount > 0) {
				await mine.addFuel(amount);
			}
		}

	}

	sortByNearestUnit(units, unit) {
		units.sort((a,b) => {
			return a.distance(unit) - b.distance(unit);
		});
	}

	sortBuildingsOverOther(units) {
		units.sort((a,b) => {
			if (a.movementType === 'building' && b.movementType === 'building') {
				return 0;
			}
			if (a.movementType === 'building' && b.movementType !== 'building') {
				return -1;
			}
			if (a.movementType !== 'building' && b.movementType === 'building') {
				return 1;
			}
			if (a.movementType !== 'building' && b.movementType !== 'building') {
				return 0;
			}
		});
	}

	//doot doot

	//tile is the tile to check
	//unit is an optional unit to ignore
	//includeGhosts decide if we should consider ghosts as units

	//TODO should have an option to find the tile that is nearest to the unit
	//rather than to center (which it does now)
	async getNearestFreeTile(center,unit,includeGhosts) {
		let unitsOnTile = await this.unitsTileCheck(center,includeGhosts);
		let unitTile = center;
		if (unit) {
			unitTile = await this.getLoc(unit.x,unit.y);
		}

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
			for (let openTile of open) {
				if (containsTile(closed,openTile)) {
					continue;
				}
				let unitsOnTile = await this.unitsTileCheck(openTile,includeGhosts);
				for (let tileUnit of unitsOnTile) {
					if (unit && unit.uuid === tileUnit.uuid) {
						return openTile; //unit is already on tile
					}
				}
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
			for (let tile of open) {

				let neighbors = [
					await tile.N(),
					await tile.S(),
					await tile.E(),
					await tile.W()
				];
				for (let neighbor of neighbors) {
					if (containsTile(open,neighbor) || containsTile(closed,neighbor)) {
						continue;
					}
					neighbor.cost = neighbor.distance(center);
					newOpened.push(neighbor);
				}
			}
		}
	}

	async getNearestEnemy(unit,range) {
		let units = await this.getNearbyUnitsFromChunk(unit.chunkHash[0]);
		this.sortByNearestUnit(units,unit);

		for (let other of units) {
			if (other.owner && unit.owner !== other.owner) {
				return other;
			}
		}

		return null;
	}

	getNearestGhost(unit) {
		console.log("STUB: getNearestGhost");
		//similar to get nearest enemy
		//TODO
	}

	async update(patch) {
		return await db.map.updateMap(this.name,patch);
	}

	async advanceTick() {
		let delta = Date.now() - this.lastTickTimestamp;
		console.log('delta',delta);
		if (delta < 1000 / env.ticksPerSec) {
			let sleepTime = (1000 / env.ticksPerSec) - delta;
			console.log('sleeping for ' + sleepTime);
			//set a timeout to wait before response
			await helper.sleep(sleepTime);
		}
		console.log('advancing tick: ', this.lastTick);
		this.lastTickTimestamp = Date.now();
		this.lastTick++;
		return await this.update({lastTick:this.lastTick,lastTickTimestamp:this.lastTickTimestamp});
	}

	save() {
		console.log("SAVE MAP DANGEROUS");
		return db.map.saveMap(this);
	}
	clone(object) {
		for (let key in object) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(object[key]);
		}

		//TODO should probably not do this
		//apply default settings to existing maps
		this.settings = _.cloneDeep(defaultSettings);
	}
}
