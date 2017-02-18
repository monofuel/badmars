/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import logger from '../util/logger';
import Context from 'node-context';
import helper from '../util/helper';
import env from '../config/env';
import { LAND } from './tiletypes';

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

function containsTile(list: Array<PlanetLoc>, tile: PlanetLoc): boolean {
	for (const item of list) {
		if (item.equals(tile)) {
			return true;
		}
	}
	return false;
}

type CacheChunkType = {
	chunk: Chunk,
	timestamp: number
};
type ChunkCacheMapType = {
	[key: string]: CacheChunkType
};

class Map {
	name: string;
	settings: Object;
	lastTickTimestamp: number;
	lastTick: number;
	users: Array<any>;
	seed: number;
	chunkCache: Array<CacheChunkType>;
	chunkCacheMap: ChunkCacheMapType;

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

	async getChunk(ctx: Context, x: number, y: number): Promise<Chunk> {
		if (!ctx) {
			logger.errorWithInfo('missing context');
		}
		x = parseInt(x);
		y = parseInt(y);
		const self = this;
		logger.checkContext(ctx, 'getChunk');
		logger.addAverageStat('chunkCacheSize', this.chunkCache.length);
		const cacheChunk: CacheChunkType = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			logger.addSumStat('cacheChunkHit', 1);
			//console.log('hit', x, y)
			return cacheChunk.chunk;
		} else {
			//console.log('miss', x, y)
			logger.addSumStat('cacheChunkMiss', 1);
		}

		return await new Promise((resolve: Function, reject: Function): Promise<Chunk> => {
			const profile = logger.startProfile('getChunk');
			logger.checkContext(ctx, 'getChunkGrpc');
			return mapClient.getChunk({ mapName: this.name, x, y }, (err: Error, response: ChunkProto): any => {
				logger.endProfile(profile);
				logger.checkContext(ctx, 'getChunkGrpcReturn');
				if (err) {
					logger.error(err);
					return reject(err);
				}
				const chunk = new Chunk();
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
		}).catch((err: Error): Promise<Chunk> => {
			logger.info('failed to get chunk, retrying', { x, y, err });
			helper.sleep(50);
			return self.getChunk(ctx, x, y);
		});
	}

	async fetchOrGenChunk(ctx: Context, x: number, y: number): Promise<Chunk> {
		if (!ctx) {
			logger.errorWithInfo('missing context');
		}

		logger.addAverageStat('chunkCacheSize', this.chunkCache.length);
		const cacheChunk = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			logger.addSumStat('cacheChunkHit', 1);
			return cacheChunk;
		} else {
			logger.addSumStat('cacheChunkMiss', 1);
		}
		let chunk: Chunk = await db.chunks[this.name].getChunk(ctx, x, y);

		if (!chunk) {
			logger.addSumStat('generatingChunk', 1);
			chunk = new Chunk(x, y, this.name);
			await chunk.save(ctx);
		}
		this.addChunkToCache(chunk);
		return chunk;
	}

	addChunkToCache(chunk: Chunk) {
		const profile = logger.startProfile('addChunkToCache');
		const entry = {
			chunk,
			timestamp: Date.now()
		};

		//clear old entries from cache
		while (this.chunkCache.length > env.chunkCacheLimit) {
			const oldChunk = this.chunkCache.shift();
			delete this.chunkCacheMap[oldChunk.chunk.hash];
		}
		this.chunkCache.push(entry);
		this.chunkCacheMap[chunk.hash] = entry;

		//sort latest to oldest
		this.chunkCache.sort((a: CacheChunkType, b: CacheChunkType): number => {
			return b.timestamp - a.timestamp;
		});
		logger.endProfile(profile);
	}

	getChunkFromCache(hash: ChunkHash): CacheChunkType {
		return this.chunkCacheMap[hash];
	}

	async getLocFromHash(ctx: Context, hash: TileHash): Promise<PlanetLoc> {
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		return await this.getLoc(ctx, x, y);
	}

	async getLoc(ctx: Context, x: number, y: number): Promise<PlanetLoc> {
		if (!ctx) {
			logger.errorWithInfo('missing context');
		}
		const real_x = Math.floor(x);
		const real_y = Math.floor(y);
		let chunkX = Math.floor(real_x / this.settings.chunkSize);
		let chunkY = Math.floor(real_y / this.settings.chunkSize);
		let local_x = real_x - (chunkX * this.settings.chunkSize);
		let local_y = real_y - (chunkY * this.settings.chunkSize);
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

		const chunk: Chunk = await this.getChunk(ctx, chunkX, chunkY);
		logger.checkContext(ctx, 'getLoc()');
		return new PlanetLoc(this, chunk, real_x, real_y);
	}

	async factoryMakeUnit(ctx: Context, unitType: string, owner: string, x: number, y: number): Promise<?Unit> {
		const newUnit = new Unit(unitType, this, x, y);
		newUnit.details.owner = owner;
		newUnit.details.ghosting = false;
		return await this.spawnUnit(ctx, newUnit);
	}

	async spawnUnit(ctx: Context, newUnit: Unit): Promise<Unit> {
		logger.checkContext(ctx, 'spawnUnit()');
		for (const loc of await newUnit.getLocs(ctx)) {
			if (!await this.checkValidForUnit(ctx, loc, newUnit)) {
				logger.errorWithInfo('invalid tile for unit', { hash: newUnit.location.hash, uuid: newUnit.uuid });
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
	async spawnUnitWithoutTileCheck(ctx: Context, newUnit: Unit): Promise<Unit> {
		return db.units[this.name].addUnit(ctx, newUnit);
	}

	async spawnAndValidate(ctx: Context, newUnit: Unit): Promise<Unit> {
		logger.checkContext(ctx, 'spawnAndValidate');
		if (!newUnit) {
			logger.errorWithInfo('missing unit');
		}
		const unit: Unit = await db.units[this.name].addUnit(ctx, newUnit);
		const success: boolean = await unit.addToChunks(ctx);
		if (!success) {
			await db.units[this.location.map].deleteUnit(ctx, unit.uuid);
			logger.errorWithInfo('spawn collision adding to chunk', { unit });
		}
		await unit.validate(ctx);
		logger.checkContext(ctx, 'spawnAndvalidate()');
		return unit;
	}

	async checkValidForUnit(ctx: Context, tile: PlanetLoc, unit: Unit, ignoreAwake: ? boolean): Promise<boolean> {
		//TODO handle air and water units
		if (tile.tileType !== LAND) {
			return false;
		}

		//TODO handle multi tile units properly
		let units = [];
		if (!unit.details.size || unit.details.size === 1) {
			units = await this.unitsTileCheck(ctx, await this.getLocFromHash(ctx, tile.hash), unit.details.ghosting);
		} else {
			const tilesToCheck = [
				(tile.x - 1) + ':' + (tile.y - 1), (tile.x) + ':' + (tile.y - 1), (tile.x + 1) + ':' + (tile.y - 1),
				(tile.x - 1) + ':' + (tile.y), (tile.x) + ':' + (tile.y), (tile.x + 1) + ':' + (tile.y),
				(tile.x - 1) + ':' + (tile.y + 1), (tile.x) + ':' + (tile.y + 1), (tile.x + 1) + ':' + (tile.y + 1)
			];
			for (const tileHash of tilesToCheck) {
				const units2 = await this.unitsTileCheck(ctx, await this.getLocFromHash(ctx, tileHash), unit.details.ghosting);
				for (const unit2 of units2) {
					units.push(unit2);
				}
			}
		}

		if (unit.details.type === 'mine') {
			let resource = false;
			for (const unit2: Unit of units) {
				if (unit2.details.type === 'iron' || unit2.details.type === 'oil') {
					resource = true;
				}
				//already has a mine
				if (unit2.details.type === 'mine') {
					console.log('already has mine');
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
			for (const unit of units) {
				if (!unit.awake && unit.movementType === 'groundUnit') {
					return true;
				}
			}
			return false;
		}

		return false;
	}

	async checkOpen(ctx: Context, tile: PlanetLoc): Promise<boolean> {
		logger.checkContext(ctx, 'checkOpen');
		//TODO handle air units
		return (await this.unitsTileCheck(ctx, tile, false)).length === 0;
	}

	async unitsTileCheck(ctx: Context, tile: PlanetLoc, includeGhosts: ? boolean): Promise<Array<Unit>> {
		//const units = await tile.chunk.getUnits(tile.hash);
		const units: Array<Unit> = await tile.getUnits(ctx);
		if (!includeGhosts) {
			return _.filter(units, (unit: Unit): boolean => { return !unit.details.ghosting; });
		} else {
			return units;
		}
	}

	async spawnUser(ctx: Context, client: Client): Promise<void> {
		//find a spawn location
		console.log('finding a spawn location')
		const chunk: Chunk = await this.findSpawnLocation(ctx);

		//spawn units for them on the chunk
		const unitsToSpawn: string[] = [
			'storage', 'builder', 'builder', 'tank', 'tank', 'iron', 'oil'
		];
		const usedTiles: TileHash[] = [];
		/*for (let i = 0; i < 50; i++) {
			unitsToSpawn.push('tank');
		}*/
		for (const unitType: string of unitsToSpawn) {
			console.log('trying to spawn ', unitType);
			let success = false;
			while (!success) {
				let x: number = this.settings.chunkSize * Math.random();
				let y: number = this.settings.chunkSize * Math.random();

				x += this.settings.chunkSize * chunk.x;
				y += this.settings.chunkSize * chunk.y;
				x = Math.round(x);
				y = Math.round(y);

				const unit = new Unit(unitType, this, x, y);
				const tilesToUse: TileHash[] = unit.location.hash;

				// check if the tiles we want to use are already used
				if (_.intersection(usedTiles, tilesToUse).length !== 0) {
					continue;
				}

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
				try {
					// https://www.youtube.com/watch?v=eVB8lM-oCSk
					if (await this.spawnUnit(ctx, unit)) {
						if (unitType === 'iron' || unitType === 'oil') {
							//assumes that if we spawn the iron or oil, we can also spawn a mine
							console.log(`spawning mine for ${unitType}`);
							const mine = new Unit('mine', this, x, y);
							mine.details.owner = client.user.uuid;
							if (!await this.spawnUnit(ctx, mine)) {
								logger.info('failed to spawn', { unitType: 'mine' , x, y });
							}
						}
						logger.info('sucessfully spawned', { unitType, x, y });
						usedTiles.push(...unit.location.hash);
						success = true;
					}
				} catch(err) {
					logger.info('spawning unit failed, retrying in new location', { msg: err.msg, x, y, unitType });
				}
			}
		}
		logger.info('spawn finished');
	}

	//find random spawn locations, looking farther away depending on how many attempts tried
	//returns a chunk of all free tiles
	async findSpawnLocation(ctx: Context, attempts: ? number): Promise<Chunk> {
		attempts = attempts || 0;

		logger.checkContext(ctx, 'finding spawn location');

		const direction = Math.random() * attempts * 50; //1magic number
		const rotation = Math.random() * Math.PI * 2; //random value between 0 and 2PI

		const x = direction * Math.cos(rotation);
		const y = direction * Math.sin(rotation);

		const tile = await this.getLoc(ctx, x, y);
		const isValid = await this.validChunkForSpawn(ctx, tile.chunk);

		if (isValid) {
			return tile.chunk;
		} else {
			return await this.findSpawnLocation(ctx, attempts + 1);
		}
	}

	async getNearbyUnitsFromChunkWithTileRange(ctx: Context, chunkHash: ChunkHash, tileRange: number): Promise<Array<Unit>> {
		const chunkRange = tileRange / this.settings.chunkSize;
		return await this.getNearbyUnitsFromChunk(ctx, chunkHash, chunkRange);
	}

	async getNearbyUnitsFromChunk(ctx: Context, chunkHash: ChunkHash, chunkRange: ? number): Promise<Array<Unit>> {
		if (!ctx) {
			logger.errorWithInfo('missing context');
		}
		if (!chunkRange) {
			chunkRange = env.chunkExamineRange;
		}
		const chunkHashes: Array<ChunkHash> = this.getNearbyChunkHashes(chunkHash, chunkRange);
		return await this.getUnitsAtChunks(ctx, chunkHashes);
	}

	async getUnitsAtChunks(ctx: Context, chunkHashes: Array<ChunkHash> ): Promise<Array<Unit>> {
		if (!ctx) {
			logger.errorWithInfo('missing context');
		}
		const units = [];
		for (const chunkHash of chunkHashes) {
			const x: number = parseInt(chunkHash.split(':')[0]);
			const y: number = parseInt(chunkHash.split(':')[1]);
			const chunk: Chunk = await this.getChunk(ctx, x, y);
			const chunkUnits: Array<Unit> = await chunk.getUnits(ctx);
			for (const unit of chunkUnits) {
				units.push(unit);
			}
		}
		return units;
	}

	getNearbyChunkHashes(chunkHash: string, range: number): Array<ChunkHash> {
		const x = parseInt(chunkHash.split(':')[0]);
		const y = parseInt(chunkHash.split(':')[1]);

		const chunks = [];
		for (let i = -range; i < range; i++) {
			for (let j = -range; j < range; j++) {
				if (Math.sqrt(i * i + j * j) < range) {
					const chunkX = x + i;
					const chunkY = y + j;
					chunks.push(chunkX + ':' + chunkY);
				}
			}
		}
		return chunks;

	}

	//TODO this function could use some love to be a bit more sane about spawning
	async validChunkForSpawn(ctx: Context, chunk: Chunk): Promise<boolean> {

		const nearbyUnits = await this.getNearbyUnitsFromChunkWithTileRange(ctx, chunk.hash, 32);
		for (const unit: Unit of nearbyUnits) {
			if (unit.details.owner !== '') {
				return false;
			}
		}

		const tiles: Array<PlanetLoc> = await chunk.getTiles(ctx);

		let landTiles = 0;
		for (const tile of tiles) {
			if (tile.tileType === LAND) {
				landTiles++;
			}
		}
		//only spawn on chunks that are 80% land
		if (landTiles < this.settings.chunkSize * this.settings.chunkSize * 0.8) {
			return false;
		}
		const unitTileChecks = [];
		for (const tile of tiles) {
			unitTileChecks.push(this.checkOpen(ctx, tile));
		}
		const tileChecks = await Promise.all(unitTileChecks);

		for (const valid of tileChecks) {
			if (!valid) {
				return false;
			}
		}
		return true;
	}

	async pullIron(ctx: Context, taker: Unit, amount: number): Promise<boolean> {
		const takerStorage = taker.getComponent('storage');

		//TODO should calculate based on transfer range
		const units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, taker.location.chunkHash[0]);

		this.sortByNearestUnit(units, taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (const unit: Unit of units) {
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
			const distance = unit.distance(taker);

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

		const pulledMap = {};
		//actually pull iron
		for (const unit: Unit of units) {
			if (unit.details.ghosting) {
				continue;
			}
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');

			const pulled = Math.min(unitStorage.iron, amount);
			if (pulled === 0) {
				continue;
			}
			const success = await unit.takeIron(ctx, pulled);
			if (success) {
				pulledMap[unit.uuid] = pulled;
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
			for (const unit of units) {
				if (pulledMap[unit.uuid]) {
					await unit.addIron(ctx, pulledMap[unit.uuid]);
				}
			}
			return false;
		}
		return true;
	}

	async pullFuel(ctx: Context, taker: Unit, amount: number): Promise<boolean> {
		const takerStorage = taker.getComponent('storage');
		//TODO should calculate based on transfer range
		const units = await this.getNearbyUnitsFromChunk(ctx, taker.location.chunkHash[0]);

		this.sortByNearestUnit(units, taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (const unit: Unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (unit.details.owner !== taker.details.owner) {
				continue;
			}

			const distance = unit.distance(taker);
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

		const pulledMap = {};
		//actually pull iron
		for (const unit of units) {
			if (unit.ghosting) {
				continue;
			}
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			const pulled = Math.min(unitStorage.iron, amount);
			if (pulled === 0) {
				continue;
			}
			const success = await unit.takeFuel(pulled);
			if (success) {
				pulledMap[unit.uuid] = pulled;
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

		return true;
	}

	async produceIron(ctx: Context, mine: Unit, amount: number): Promise<void> {

		const mineStorage = mine.getComponent('storage');
		//TODO should calculate based on transfer range
		const units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		for (const unit: Unit of units) {
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
			const distance = unit.distance(mine);
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			if (distance > unitStorage.transferRange && distance > mineStorage.transferRange) {
				continue;
			}
			const deposited = await unit.addIron(ctx, amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
		}
		if (amount > 0) {
			//console.log('depositing iron into mine',amount);
			await mine.addIron(ctx, amount);
		}
	}

	async produceFuel(ctx: Context, mine: Unit, amount: number): Promise<void> {
		const mineStorage = mine.getComponent('storage');
		//TODO should calculate based on transfer range
		const units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		for (const unit: Unit of units) {
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
			const distance = unit.distance(mine);
			if (!unit.storage) {
				continue;
			}
			const unitStorage = unit.getComponent('storage');
			if (distance > unitStorage.transferRange && distance > mineStorage.transferRange) {
				continue;
			}
			const deposited = await unit.addFuel(ctx, amount);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
			if (amount > 0) {
				await mine.addFuel(ctx, amount);
			}
		}

	}

	sortByNearestUnit(units: Array<Unit> , unit: Unit) {
		units.sort((a: Unit, b: Unit): number => {
			return a.distance(unit) - b.distance(unit);
		});
	}

	sortBuildingsOverOther(units: Array<Unit> ) {
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
		logger.checkContext(ctx, 'getNearestFreeTile');
		const unitsOnTile: Array<Unit> = await this.unitsTileCheck(ctx, center, includeGhosts);

		//check if the tile we are checking is already free
		if (unitsOnTile.length == 0 && center.tileType == LAND) {
			return center;
		} else {
			//check if the unit is already on this tile
			if (unit) {
				for (const unit2 of unitsOnTile) {
					if (unit.uuid === unit2.uuid) {
						return center;
					}
				}
			}
		}

		const open = [
			await this.getLoc(ctx, center.x + 1, center.y),
			await this.getLoc(ctx, center.x - 1, center.y),
			await this.getLoc(ctx, center.x, center.y - 1),
			await this.getLoc(ctx, center.x, center.y + 1)
		];

		for (const tile of open) {
			tile.cost = tile.distance(center);
		}
		const closed = [];
		let newOpened = [];
		while (true) {
			for (const newOpen of newOpened) {
				open.push(newOpen);
			}
			newOpened = [];

			open.sort((a: PlanetLoc, b: PlanetLoc): number => {
				return a.cost - b.cost;
			});
			for (const openTile of open) {
				if (containsTile(closed, openTile)) {
					continue;
				}
				const unitsOnTile = await this.unitsTileCheck(ctx, openTile, includeGhosts);
				for (const tileUnit of unitsOnTile) {
					if (unit && unit.uuid === tileUnit.uuid) {
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

				return openTile;
			}
			for (const tile of open) {

				const neighbors = [
					await tile.N(),
					await tile.S(),
					await tile.E(),
					await tile.W()
				];
				for (const neighbor of neighbors) {
					if (containsTile(open, neighbor) || containsTile(closed, neighbor)) {
						continue;
					}
					neighbor.cost = neighbor.distance(center);
					newOpened.push(neighbor);
				}
			}
		}
	}

	async getNearestEnemy(ctx: Context, unit: Unit): Promise<?Unit> {
		const units = await this.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
		this.sortByNearestUnit(units, unit);

		for (const other: Unit of units) {
			if (other.details.owner && unit.details.owner !== other.details.owner) {
				return other;
			}
		}

		return null;
	}

	async update(patch: Object): Promise<void> {
		return await db.map.updateMap(this.name, patch);
	}

	async advanceTick(): Promise<void> {
		const delta = Date.now() - this.lastTickTimestamp;
		//console.log('delta',delta);
		if (delta < 1000 / env.ticksPerSec) {
			const sleepTime = (1000 / env.ticksPerSec) - delta;
			//console.log('sleeping for ' + sleepTime);
			//set a timeout to wait before response
			await helper.sleep(sleepTime);
		}
		//console.log('advancing tick: ', this.lastTick);
		this.lastTickTimestamp = Date.now();
		this.lastTick++;
		return await this.update({ lastTick: this.lastTick, lastTickTimestamp: this.lastTickTimestamp });
	}

	/*save() {
		console.log('SAVE MAP DANGEROUS');
		return db.map.saveMap(this);
	}*/

	clone(object: any) {
		for (const key in object) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(object[key]);
		}

		//TODO should probably not do this
		//apply default settings to existing maps
		this.settings = _.cloneDeep(defaultSettings);
	}
}
console.log('exporting map');
module.exports = Map;

import { checkEmptyImport } from '../util/helper';

const Chunk = require('./chunk');
checkEmptyImport(Chunk, 'Chunk', 'map.js');

const PlanetLoc = require('./planetloc');
checkEmptyImport(PlanetLoc, 'PlanetLoc', 'map.js');

const Unit = require('../unit/unit');
checkEmptyImport(Unit, 'Unit', 'map.js');

const Client = require('../net/client');
checkEmptyImport(Client, 'Client', 'map.js');

const db = require('../db/db');
checkEmptyImport(db,'db', 'map.js');
