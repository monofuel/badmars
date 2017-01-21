/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import db from '../db/db';
import logger from '../util/logger';
import helper from '../util/helper';
import env from '../config/env';
import Chunk from './chunk';
import PlanetLoc from "./planetloc";
import { LAND } from './tiletypes';
import Unit from '../unit/unit';
import Context from 'node-context';
import Client from '../net/client';

import grpc from 'grpc';

const chunkService = grpc.load(__dirname + '/../../protos/chunk.proto').chunk;
const mapClient = new chunkService.Map(env.mapHost + ':' + env.mapPort, grpc.credentials.createInsecure());

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

function containsTile(list, tile) {
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

export default class Map {
	name: string;
	settings: Object;
	lastTickTimestamp: number;
	lastTick: number;
	users: Array < any > ;
	seed: number;
	chunkCache: Array < CacheChunk > ;
	chunkCacheMap: ChunkCacheMap;

	constructor(name: ? string) {
		if (!name) {
			return; // null constructor for database
		}
		this.name = name;
		this.settings = _.cloneDeep(defaultSettings);
		this.lastTickTimestamp = (new Date()).getTime();
		this.lastTick = 0;
		this.users = [];
		this.seed = Math.random();
		this.chunkCache = [];
		this.chunkCacheMap = {};
	}

	async getChunk(x: number, y: number) {
		x = parseInt(x);
		y = parseInt(y);
		const self = this;

		logger.addAverageStat('chunkCacheSize', this.chunkCache.length);
		let cacheChunk = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			logger.addSumStat('cacheChunkHit', 1);
			return cacheChunk;
		} else {
			logger.addSumStat('cacheChunkMiss', 1);
		}

		return await new Promise((resolve, reject) => {
			let profile = logger.startProfile('getChunk');
			return mapClient.getChunk({ mapName: this.name, x, y }, (err: Error, response: ChunkProto) => {
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
				resolve(chunk);
			});
		}).catch((err) => {
			console.log('failed to get chunk, retrying');
			helper.sleep(50);
			return self.getChunk(x, y);
		});
	}

	async fetchOrGenChunk(x: number, y: number) {

		logger.addAverageStat('chunkCacheSize', this.chunkCache.length);
		let cacheChunk = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			logger.addSumStat('cacheChunkHit', 1);
			return cacheChunk;
		} else {
			logger.addSumStat('cacheChunkMiss', 1);
		}
		let chunk = await db.chunks[this.name].getChunk(x, y);

		if (!chunk || !chunk.isValid()) {
			logger.addSumStat('generatingChunk', 1);
			chunk = new Chunk(x, y, this.name);
			await chunk.save();
		}
		this.addChunkToCache(chunk);
		return chunk;
	}

	addChunkToCache(chunk: Chunk) {
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
		this.chunkCacheMap[chunk.hash] = entry;

		//sort latest to oldest
		this.chunkCache.sort((a, b) => {
			return b.timestamp - a.timestamp
		});
		logger.endProfile(profile);
	}

	getChunkFromCache(hash: ChunkHash) {
		return this.chunkCacheMap[hash];
	}

	async getLocFromHash(ctx: Context, hash: TileHash) {
		let x = parseInt(hash.split(':')[0]);
		let y = parseInt(hash.split(':')[1]);
		return await this.getLoc(ctx, x, y);
	}

	async getLoc(ctx: Context, x: number, y: number): Promise < PlanetLoc > {
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

		let chunk: Chunk = await this.getChunk(chunkX, chunkY);
		logger.checkContext(ctx, 'getLoc()');
		return new PlanetLoc(this, chunk, real_x, real_y);
	}
	async factoryMakeUnit(ctx: Context, unitType: string, owner: string, x: number, y: number) {
		let newUnit = new Unit(unitType, this, x, y);
		newUnit.details.owner = owner;
		newUnit.details.ghosting = false;
		return await this.spawnUnit(ctx, newUnit);
	}

	async spawnUnit(ctx: Context, newUnit: Unit): Promise < ? Unit > {
		console.log('spawning unit: ' + newUnit.details.type);
		for (let loc of await newUnit.getLocs()) {
			if (!await this.checkValidForUnit(ctx, loc, newUnit)) {
				return null;
			} else {
				//console.log('valid tile for unit: ' + tileHash);
			}
		}
		const unit = await this.spawnAndValidate(ctx, newUnit);
		logger.checkContext(ctx, 'spawnUnit()');
		return unit;
	}

	//to be used when spawning units on chunks that are not yet generated
	//this prevents a loop of trying to validate against a chunk that
	//is not yet generated (hence infinite loop)
	async spawnUnitWithoutTileCheck(ctx: Context, newUnit: Unit): Promise < Unit > {
		console.log('force spawning unit: ' + newUnit.details.type);
		return db.units[this.name].addUnit(ctx, newUnit);
	}
	async spawnAndValidate(ctx: Context, newUnit: Unit): Promise < ? Unit > {
		const unit = await db.units[this.name].addUnit(ctx, newUnit);
		const success = await unit.addToChunks(ctx);
		if (!success) {
			console.log("spawn collision");
			await unit.delete();
			return null;
		}
		await unit.validate();
		logger.checkContext(ctx, 'spawnAndvalidate()');
		return unit;
	}

	async checkValidForUnit(ctx: Context, tile: PlanetLoc, unit: Unit, ignoreAwake: ? boolean) {
		//TODO handle air and water units
		if (tile.tileType !== LAND) {
			return false;
		}

		//TODO handle multi tile units properly
		let units = [];
		if (!unit.details.size || unit.details.size === 1) {
			units = await this.unitsTileCheck(await this.getLocFromHash(ctx, tile.hash), unit.details.ghosting);
		} else {
			let tilesToCheck = [
				(tile.x - 1) + ":" + (tile.y - 1), (tile.x) + ":" + (tile.y - 1), (tile.x + 1) + ":" + (tile.y - 1),
				(tile.x - 1) + ":" + (tile.y), (tile.x) + ":" + (tile.y), (tile.x + 1) + ":" + (tile.y),
				(tile.x - 1) + ":" + (tile.y + 1), (tile.x) + ":" + (tile.y + 1), (tile.x + 1) + ":" + (tile.y + 1)
			];
			for (let tileHash of tilesToCheck) {
				let units2 = await this.unitsTileCheck(await this.getLocFromHash(ctx, tileHash), unit.details.ghosting);
				for (let unit2 of units2) {
					units.push(unit2);
				}
			}
		}

		if (unit.details.type === 'mine') {
			console.log('checking mine');
			let resource = false;
			for (let unit2: Unit of units) {
				if (unit2.details.type === 'iron' || unit2.details.type === 'oil') {
					console.log('found resource');
					resource = true;
				}
				//already has a mine
				if (unit2.details.type === 'mine') {
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

	async checkOpen(tile: PlanetLoc) {
		//TODO handle air units
		return (await this.unitsTileCheck(tile, false)).length === 0;
	}

	async unitsTileCheck(tile: PlanetLoc, includeGhosts: ? boolean): Promise < Array < Unit >> {
		//const units = await tile.chunk.getUnits(tile.hash);
		let units = await db.units[this.name].getUnitsAtTile(tile.hash);
		if (!includeGhosts) {
			return _.filter(units, (unit) => { return !unit.details.ghosting });
		} else {
			return units;
		}
	}

	async spawnUser(ctx: Context, client: Client): Promise<void> {
		//find a spawn location
		let chunk: Chunk = await this.findSpawnLocation(ctx);

		//spawn units for them on the chunk
		let unitsToSpawn = [
			'storage', 'builder', 'builder', 'tank', 'tank', 'iron', 'oil'
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

				let unit = new Unit(unitType, this, x, y);
				if (unitType !== 'iron' && unitType !== 'oil') {
					unit.details.owner = client.user.uuid;
				}
				let unitStorage: ?Object = null;
				if (unit.storage) {
					unitStorage = unit.getComponent('storage');
				}
				switch (unitType) {
				case 'storage':
					if (!unitStorage) {
						throw new Error('storage unit missing storage');
					}
					unitStorage.fuel = 1000;
					unitStorage.iron = 1000;
					break;
				case 'tank':
				case 'builder':
					if (!unitStorage) {
						throw new Error('builder unit missing storage');
					}
					unitStorage.fuel = 50;
					break;
				}

				// https://www.youtube.com/watch?v=eVB8lM-oCSk
				if (await this.spawnUnit(ctx, unit)) {
					console.log('spawned ' + unitType + ' for player ' + client.username);
					if (unitType === 'iron' || unitType === 'oil') {
						let mine = new Unit('mine', this, x, y);
						mine.details.owner = client.user.uuid;
						console.log('spawned mine for player ' + client.username);
						if (!await this.spawnUnit(ctx, mine)) {
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
	async findSpawnLocation(ctx: Context, attempts: ? number) {
		attempts = attempts || 0;

		logger.checkContext(ctx, 'finding spawn location');

		var direction = Math.random() * attempts * 50; //1magic number
		var rotation = Math.random() * Math.PI * 2; //random value between 0 and 2PI

		var x = direction * Math.cos(rotation);
		var y = direction * Math.sin(rotation);

		let tile = await this.getLoc(ctx, x, y);
		let isValid = await this.validChunkForSpawn(ctx, tile.chunk);

		if (isValid) {
			return tile.chunk;
		} else {
			return await this.findSpawnLocation(ctx, attempts + 1);
		}
	}

	async getNearbyUnitsFromChunkWithTileRange(ctx: Context, chunkHash: ChunkHash, tileRange: number): Promise < Array < Unit >> {
		let chunkRange = tileRange / this.settings.chunkSize;
		return await this.getNearbyUnitsFromChunk(ctx, chunkHash, chunkRange);
	}

	async getNearbyUnitsFromChunk(ctx: Context, chunkHash: ChunkHash, chunkRange: ? number): Promise < Array < Unit >> {
		if (!chunkRange) {
			chunkRange = env.chunkExamineRange;
		}
		let chunkHashes: Array < ChunkHash > = this.getNearbyChunkHashes(chunkHash, chunkRange);
		return await this.getUnitsAtChunks(ctx, chunkHashes);
	}

	async getUnitsAtChunks(ctx: Context, chunkHashes: Array < ChunkHash > ): Promise < Array < Unit >> {
		let units = [];
		for (let chunkHash of chunkHashes) {
			let x = parseInt(chunkHash.split(':')[0]);
			let y = parseInt(chunkHash.split(':')[1]);
			let chunk = await this.getChunk(ctx, x, y);
			let chunkUnits = await chunk.getUnits(ctx);
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
	async validChunkForSpawn(ctx: Context, chunk: Chunk) {
		var self = this;

		let nearbyUnits = await this.getNearbyUnitsFromChunkWithTileRange(ctx, chunk.hash, 32);
		for (let unit: Unit of nearbyUnits) {
			if (unit.details.owner !== "") {
				return false;
			}
		}


		return chunk.getTiles(ctx).then((tiles) => {
			console.log('checking tile types');
			var landTiles = 0;
			for (let tile of tiles) {
				if (tile.tileType === LAND) {
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

	async pullIron(ctx: Context, taker: Unit, amount: number) {
		console.log('pulling iron');
		const takerStorage = taker.getComponent('storage');

		//TODO should calculate based on transfer range
		let units: Array < Unit > = await this.getNearbyUnitsFromChunk(ctx, taker.location.chunkHash[0]);

		this.sortByNearestUnit(units, taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (let unit: Unit of units) {
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			if (unit.ghosting) {
				continue;
			}
			if (unit.details.owner !== taker.details.owner) {
				continue;
			}
			let distance = unit.distance(taker);

			if (distance > unitStorage.transferRange && distance > takerStorage.transferRange) {
				continue;
			}

			amountCanPull += unitStorage.iron;
			if (amountCanPull > amount) {
				break;
			}
		}
		if (amountCanPull < amount) {
			return false;
		}

		let pulledMap = {};
		//actually pull iron
		for (let unit: Unit of units) {
			if (unit.details.ghosting) {
				continue;
			}
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');

			let pulled = Math.min(unitStorage.iron, amount);
			if (pulled === 0) {
				continue;
			}
			console.log('pulling: ' + pulled);
			let success = await unit.takeIron(ctx, pulled);
			console.log('success:', success, ':', pulled);
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

	async pullFuel(ctx: Context, taker: Unit, amount: number) {
		console.log('pulling iron');
		const takerStorage = taker.getComponent('storage');
		//TODO should calculate based on transfer range
		let units = await this.getNearbyUnitsFromChunk(ctx, taker.location.chunkHash[0]);

		this.sortByNearestUnit(units, taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (let unit: Unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.details.owner !== taker.details.owner) {
				continue;
			}

			let distance = unit.distance(taker);
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			if (distance > unitStorage.transferRange && distance > takerStorage.transferRange) {
				continue;
			}
			amountCanPull += unitStorage.fuel;
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
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			let pulled = Math.min(unitStorage.iron, amount);
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

	async produceIron(ctx: Context, mine: Unit, amount: number) {

		const mineStorage = mine.getComponent('storage');
		//TODO should calculate based on transfer range
		let units: Array < Unit > = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		for (let unit: Unit of units) {
			if (unit.details.ghosting) {
				continue;
			}
			if (unit.details.owner !== mine.details.owner) {
				continue;
			}
			if (mine.uuid === unit.uuid) {
				continue;
			}
			if (unit.movable) {
				continue;
			}
			let distance = unit.distance(mine);
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			if (distance > unitStorage.transferRange && distance > mineStorage.transferRange) {
				continue;
			}
			let deposited = await unit.addIron(amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
		}
		if (amount > 0) {
			//console.log('depositing iron into mine',amount);
			await mine.addIron(amount);
		}
	}

	async produceFuel(ctx: Context, mine: Unit, amount: number) {
		const mineStorage = mine.getComponent('storage');
		//TODO should calculate based on transfer range
		let units: Array < Unit > = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		for (let unit: Unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.details.owner !== mine.details.owner) {
				continue;
			}
			if (mine.uuid === unit.uuid) {
				continue;
			}
			if (unit.movable) {
				continue;
			}
			let distance = unit.distance(mine);
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			if (distance > unitStorage.transferRange && distance > mineStorage.transferRange) {
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

	sortByNearestUnit(units: Array < Unit > , unit: Unit) {
		units.sort((a: Unit, b: Unit) => {
			return a.distance(unit) - b.distance(unit);
		});
	}

	sortBuildingsOverOther(units: Array < Unit > ) {
		units.sort((a: Unit, b: Unit): number => {
			if (a.stationary && b.movable) {
				return -1;
			}
			if (a.movable && b.stationary) {
				return 1;
			}
			return 0;
		});
	}

	//doot doot

	//center is the tile to check
	//unit is an optional unit to ignore
	//includeGhosts decide if we should consider ghosts as units

	//TODO should have an option to find the tile that is nearest to the unit
	//rather than to center (which it does now)
	async getNearestFreeTile(ctx: Context, center: PlanetLoc, unit?: Unit, includeGhosts?: boolean): Promise<?PlanetLoc> {
		let unitsOnTile: Array < Unit > = await this.unitsTileCheck(center, includeGhosts);
		let unitTile: PlanetLoc = center;
		if (unit) {
			unitTile = await this.getLoc(ctx, unit.location.x, unit.location.y);
		}

		//check if the tile we are checking is already free
		if (unitsOnTile.length == 0 && center.tileType == LAND) {
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
			await this.getLoc(ctx, center.x + 1, center.y),
			await this.getLoc(ctx, center.x - 1, center.y),
			await this.getLoc(ctx, center.x, center.y - 1),
			await this.getLoc(ctx, center.x, center.y + 1)
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

			open.sort((a, b) => {
				return a.cost - b.cost;
			});
			for (let openTile of open) {
				if (containsTile(closed, openTile)) {
					continue;
				}
				let unitsOnTile = await this.unitsTileCheck(openTile, includeGhosts);
				for (let tileUnit of unitsOnTile) {
					if (unit && unit.uuid === tileUnit.uuid) {
						console.log(_.map(unitsOnTile, 'uuid'));
						console.log('unit already at tile:' + openTile.hash)
						return openTile; //unit is already on tile
					}
				}
				if (unitsOnTile.length !== 0) {
					closed.push(openTile);
					continue;
				}
				if (openTile.tileType !== LAND) {
					closed.push(openTile);
					continue;
				}

				console.log('found open tile')
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
					if (containsTile(open, neighbor) || containsTile(closed, neighbor)) {
						continue;
					}
					neighbor.cost = neighbor.distance(center);
					newOpened.push(neighbor);
				}
			}
		}
	}

	async getNearestEnemy(ctx: Context, unit: Unit, range?: number) {
		let units = await this.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
		this.sortByNearestUnit(units, unit);

		for (let other: Unit of units) {
			if (other.details.owner && unit.details.owner !== other.details.owner) {
				return other;
			}
		}

		return null;
	}

	getNearestGhost(unit: Unit) {
		console.log("STUB: getNearestGhost");
		//similar to get nearest enemy
		//TODO
	}

	async update(patch: Object) {
		return await db.map.updateMap(this.name, patch);
	}

	async advanceTick() {
		let delta = Date.now() - this.lastTickTimestamp;
		//console.log('delta',delta);
		if (delta < 1000 / env.ticksPerSec) {
			let sleepTime = (1000 / env.ticksPerSec) - delta;
			//console.log('sleeping for ' + sleepTime);
			//set a timeout to wait before response
			await helper.sleep(sleepTime);
		}
		//console.log('advancing tick: ', this.lastTick);
		this.lastTickTimestamp = Date.now();
		this.lastTick++;
		return await this.update({ lastTick: this.lastTick, lastTickTimestamp: this.lastTickTimestamp });
	}

	save() {
		console.log("SAVE MAP DANGEROUS");
		return db.map.saveMap(this);
	}
	clone(object: any) {
		for (let key in object) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(object[key]);
		}

		//TODO should probably not do this
		//apply default settings to existing maps
		this.settings = _.cloneDeep(defaultSettings);
	}
}
