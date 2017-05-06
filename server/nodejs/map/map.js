/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import grpc from 'grpc';

import { checkContext, WrappedError } from '../util/logger';
import type MonoContext from '../util/monoContext';
import env from '../config/env';
import { LAND } from './tiletypes';
import Chunk from './chunk';
import PlanetLoc, { getLocationDetails } from './planetloc';
import Unit from '../unit/unit';
import Client from '../net/client';
import sleep from '../util/sleep';

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

export default class Map {
	name: string;
	settings: Object;
	lastTickTimestamp: number;
	lastTick: number;
	users: Array<any>;
	seed: number;
	chunkCache: Array<CacheChunkType>;
	chunkCacheMap: ChunkCacheMapType;
	paused: boolean;

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
		this.paused = false;
	}

	async getChunk(ctx: MonoContext, x: number, y: number): Promise<Chunk> {
		checkContext(ctx, 'getChunk');
		x = parseInt(x);
		y = parseInt(y);
		const self = this;
		ctx.logger.addAverageStat('chunkCacheSize', this.chunkCache.length);
		const cacheChunk: CacheChunkType = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			ctx.logger.addSumStat('cacheChunkHit', 1);
			return cacheChunk.chunk;
		} else {
			ctx.logger.addSumStat('cacheChunkMiss', 1);
		}

		return await new Promise((resolve: Function, reject: Function): Promise<Chunk> => {
			const profile = ctx.logger.startProfile('getChunk');
			checkContext(ctx, 'getChunkGrpc');
			return mapClient.getChunk({ mapName: this.name, x, y }, (err: Error, response: ChunkProto): any => {
				ctx.logger.endProfile(profile);
				checkContext(ctx, 'getChunkGrpcReturn');
				if (err) {
					ctx.logger.trackError(ctx, new WrappedError(err, 'getChunk grpc', { mapName: this.name, x, y }));
					return reject(err);
				}
				for (let i = 0; i < response.navGrid.length; i++) {
					response.navGrid[i] = response.navGrid[i].items;
				}
				for (let i = 0; i < response.grid.length; i++) {
					response.grid[i] = response.grid[i].items;
				}
				const chunk = new Chunk(this.name, x, y);
				chunk.clone(response);
				
				this.addChunkToCache(ctx, chunk);
				resolve(chunk);
			});
		}).catch((err: Error): Promise<Chunk> => {
			ctx.logger.info(ctx, 'failed to get chunk, retrying', { x, y, err });
			sleep(50);
			return self.getChunk(ctx, x, y);
		});
	}

	async fetchOrGenChunk(ctx: MonoContext, x: number, y: number): Promise<Chunk> {
		checkContext(ctx, 'fetchOrGenChunk');
		ctx.logger.addAverageStat('chunkCacheSize', this.chunkCache.length);
		const cacheChunk: CacheChunkType = this.getChunkFromCache(x + ':' + y);
		if (cacheChunk) {
			ctx.logger.addSumStat('cacheChunkHit', 1);
			return cacheChunk.chunk;
		} else {
			ctx.logger.addSumStat('cacheChunkMiss', 1);
		}
		let chunk: Chunk;
		try {
			chunk = await ctx.db.chunks[this.name].getChunk(ctx, x, y);
		} catch (err) {
			throw new WrappedError(err, 'fetching chunk from db');
		}

		if (!chunk) {
			ctx.logger.addSumStat('generatingChunk', 1);
			chunk = new Chunk(this.name, x, y);
			await chunk.save(ctx);
		}
		this.addChunkToCache(ctx, chunk);
		return chunk;
	}

	addChunkToCache(ctx: MonoContext, chunk: Chunk) {
		checkContext(ctx, 'addChunkToCache');
		const profile = ctx.logger.startProfile('addChunkToCache');
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
		ctx.logger.endProfile(profile);
	}

	getChunkFromCache(hash: ChunkHash): CacheChunkType {
		return this.chunkCacheMap[hash];
	}

	async getLocFromHash(ctx: MonoContext, hash: TileHash): Promise<PlanetLoc> {
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		return await this.getLoc(ctx, x, y);
	}

	async getLoc(ctx: MonoContext, x: number, y: number): Promise<PlanetLoc> {
		checkContext(ctx, 'getLoc');
		const details = getLocationDetails(x, y, this.settings.chunkSize);

		const chunk: Chunk = await this.getChunk(ctx, details.chunkX, details.chunkY);
		checkContext(ctx, 'getLoc end');
		try {
			return new PlanetLoc(this, chunk, details);
		} catch (err) {
			throw new WrappedError(err, 'failed to get planetLoc in getLoc');
		}
	}

	async factoryMakeUnit(ctx: MonoContext, unitType: string, owner: string, x: number, y: number): Promise<?Unit> {
		const newUnit = new Unit(ctx, unitType, this, x, y);
		newUnit.details.owner = owner;
		newUnit.details.ghosting = false;
		return await this.spawnUnit(ctx, newUnit);
	}

	async spawnUnit(ctx: MonoContext, newUnit: Unit): Promise<Unit> {
		checkContext(ctx, 'spawnUnit');
		for (const loc of await newUnit.getLocs(ctx)) {
			const badReason = await this.checkValidForUnit(ctx, loc, newUnit);
			if (badReason) {
				throw new WrappedError(new Error(badReason), 'spawnUnit');
			}
		}
		const unit = await this.spawnAndValidate(ctx, newUnit);
		checkContext(ctx, 'spawnUnit end');
		return unit;
	}

	//to be used when spawning units on chunks that are not yet generated
	//this prevents a loop of trying to validate against a chunk that
	//is not yet generated (hence infinite loop)
	async spawnUnitWithoutTileCheck(ctx: MonoContext, newUnit: Unit): Promise<Unit> {
		return ctx.db.units[this.name].addUnit(ctx, newUnit);
	}

	async spawnAndValidate(ctx: MonoContext, newUnit: Unit): Promise<Unit> {
		checkContext(ctx, 'spawnAndValidate');
		const unit: Unit = await ctx.db.units[this.name].addUnit(ctx, newUnit);
		try {
			await unit.addToChunks(ctx);
		} catch (err) {
			try {
				await ctx.db.units[this.name].deleteUnit(ctx, unit.uuid);
			} catch (err) {
				throw new WrappedError(err, 'failed to cleanup with failed spawn in spawnAndValidate');
			}
			throw new WrappedError(err, 'failed to spawn in spawnAndValidate');
		}
		await unit.validate(ctx);
		checkContext(ctx, 'spawnAndvalidate end');
		return unit;
	}

	async checkValidForUnit(ctx: MonoContext, tile: PlanetLoc, unit: Unit, ignoreAwake: ? boolean): Promise<?string> {
		//TODO handle air and water units
		if (tile.tileType !== LAND) {
			return 'tiletype is not land';
		}

		const units: Array<Unit> = [];
		const tilesToCheck: Array<PlanetLoc> = await unit.getLocs(ctx);
		for (const tile: PlanetLoc of tilesToCheck) {
			const units2: Array<Unit> = await this.unitsTileCheck(ctx, tile, unit.details.ghosting);
			for (const unit2: Unit of units2) {
				units.push(unit2);
			}
		}

		if (unit.details.type === 'mine') {
			for (const unit2: Unit of units) {
				if (unit2.details.type === 'iron' || unit2.details.type === 'oil') {
					return;
				}
				//already has a mine
				if (unit2.details.type === 'mine') {
					return 'already has mine';
				}
			}
			return 'no resource for mine';
		}

		if (units.length === 0) {
			return;
		}

		if (units.length === 1 && unit.uuid === units[0].uuid) {
			return;
		}

		if (ignoreAwake) {
			for (const unit of units) {
				if (!unit.awake && unit.movementType === 'groundUnit') {
					return;
				}
			}
		}

		return 'has another unit';
	}

	async checkOpen(ctx: MonoContext, tile: PlanetLoc): Promise<boolean> {
		checkContext(ctx, 'checkOpen');
		//TODO handle air units
		return (await this.unitsTileCheck(ctx, tile, false)).length === 0;
	}

	async unitsTileCheck(ctx: MonoContext, tile: PlanetLoc, includeGhosts: ? boolean): Promise<Array<Unit>> {
		//const units = await tile.chunk.getUnits(tile.hash);
		const units: Array<Unit> = await tile.getUnits(ctx);
		if (!includeGhosts) {
			return _.filter(units, (unit: Unit): boolean => { return !unit.details.ghosting; });
		} else {
			return units;
		}
	}

	async spawnUser(ctx: MonoContext, client: Client): Promise<void> {

		//find a spawn location
		ctx.logger.info(ctx, 'finding spawn location');
		const chunk: Chunk = await this.findSpawnLocation(ctx);

		//spawn units for them on the chunk
		const unitsToSpawn: string[] = [
			'storage', 'builder', 'builder', 'tank', 'tank', 'iron', 'oil'
		];

		const usedTiles: TileHash[] = [];
		const spawnedUnits: Unit[] = [];

		for (const unitType: string of unitsToSpawn) {
			while (true) {
				let x: number = this.settings.chunkSize * Math.random();
				let y: number = this.settings.chunkSize * Math.random();

				x += this.settings.chunkSize * chunk.x;
				y += this.settings.chunkSize * chunk.y;
				x = Math.round(x);
				y = Math.round(y);

				let unit: Unit = new Unit(ctx, unitType, this, x, y);
				const tilesToUse: TileHash[] = unit.location.hash;

				// check if the tiles we want to use are already used
				if (_.intersection(usedTiles, tilesToUse).length !== 0) {
					continue;
				}

				const tiles: PlanetLoc[] = await unit.getLocs(ctx);
				let notLand = false;
				for (const tile: PlanetLoc of tiles) {
					if (tile.tileType !== LAND) {
						notLand = true;
					}
				}
				if (notLand) {
					continue;
				}
				

				ctx.logger.info(ctx, 'spawning unit', { unitType, x, y });

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
					unit = await this.spawnUnit(ctx, unit);
					spawnedUnits.push(unit);

					ctx.logger.info(ctx, 'sucessfully spawned', { unitType, x, y });
					usedTiles.push(...unit.location.hash);

					if (unitType === 'iron' || unitType === 'oil') {
						//assumes that if we spawn the iron or oil, we can also spawn a mine
						const mine = new Unit(ctx, 'mine', this, x, y);
						mine.details.owner = client.user.uuid;
						try {
							const spawnedMine: Unit = await this.spawnUnitWithoutTileCheck(ctx, mine);
							spawnedUnits.push(spawnedMine);
						} catch (err) {
							throw new WrappedError(err,`failed to spawn mine for ${unitType}`);
						}
					}
					break;
				} catch(err) {
					for (const unit of spawnedUnits) {
						try {
							const locs = await unit.getLocs(ctx);
							for (const loc of locs) {
								try {
									await loc.chunk.clearUnit(ctx, unit.uuid, loc.hash);
								} catch (err) {
									// NOOP
								}
							}
						} catch (err) {
							ctx.logger.trackError(ctx, new WrappedError(err, 'failed to remove unit during rollback unit spawn'));
						}
						try {
							await ctx.db.units[this.name].deleteUnit(ctx, unit.uuid);
						} catch (err) {
							ctx.logger.trackError(ctx, new WrappedError(err, 'failed to delete unit to rollback unit spawn'));
						}
					}
					throw new WrappedError(err, 'spawning unit failed, bailing out', {  x, y, unitType });
				}
			}
		}
		ctx.logger.info(ctx, 'spawn finished');
	}

	//find random spawn locations, looking farther away depending on how many attempts tried
	//returns a chunk of all free tiles
	async findSpawnLocation(ctx: MonoContext, attempts: ? number): Promise<Chunk> {
		attempts = attempts || 0;

		checkContext(ctx, 'finding spawn location');

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

	async getNearbyUnitsFromChunkWithTileRange(ctx: MonoContext, chunkHash: ChunkHash, tileRange: number): Promise<Array<Unit>> {
		const chunkRange = tileRange / this.settings.chunkSize;
		return await this.getNearbyUnitsFromChunk(ctx, chunkHash, chunkRange);
	}

	async getNearbyUnitsFromChunk(ctx: MonoContext, chunkHash: ChunkHash, chunkRange: ? number): Promise<Array<Unit>> {
		checkContext(ctx, 'getNearbyUnitsFromChunk');
		if (!chunkRange) {
			chunkRange = env.chunkExamineRange;
		}
		const chunkHashes: Array<ChunkHash> = this.getNearbyChunkHashes(chunkHash, chunkRange);
		return await this.getUnitsAtChunks(ctx, chunkHashes);
	}

	async getUnitsAtChunks(ctx: MonoContext, chunkHashes: Array<ChunkHash> ): Promise<Array<Unit>> {
		checkContext(ctx, 'getUnitsAtChunks');
		const units = [];
		for (const chunkHash of chunkHashes) {
			const x: number = parseInt(chunkHash.split(':')[0]);
			const y: number = parseInt(chunkHash.split(':')[1]);
			const chunk: Chunk = await this.getChunk(ctx, x, y);
			try {
				const chunkUnits: Array<Unit> = await chunk.getUnits(ctx);
				
				for (const unit of chunkUnits) {
					units.push(unit);
				}
			} catch (err) {
				throw new WrappedError(err, 'failed to get units at chunks');
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
	async validChunkForSpawn(ctx: MonoContext, chunk: Chunk): Promise<boolean> {

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

	async pullIron(ctx: MonoContext, taker: Unit, amount: number): Promise<boolean> {
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

	async pullFuel(ctx: MonoContext, taker: Unit, amount: number): Promise<boolean> {
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

	async produceIron(ctx: MonoContext, mine: Unit, amount: number): Promise<void> {

		const mineStorage = mine.getComponent('storage');
		//TODO should calculate based on transfer range
		const units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		ctx.logger.info(ctx, 'depositing iron from mine',{ amount }, { silent: true });

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
			ctx.logger.info(ctx, 'depositing iron into mine',{ amount });
			await mine.addIron(ctx, amount);
		}
	}

	async produceFuel(ctx: MonoContext, mine: Unit, amount: number): Promise<void> {
		const mineStorage = mine.getComponent('storage');
		//TODO should calculate based on transfer range
		const units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		ctx.logger.info(ctx, 'depositing oil from mine',{ amount }, { silent: true });

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
	async getNearestFreeTile(ctx: MonoContext, center: PlanetLoc, unit?: Unit, includeGhosts?: boolean): Promise<?PlanetLoc> {
		checkContext(ctx, 'getNearestFreeTile');
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

	async getNearestEnemy(ctx: MonoContext, unit: Unit): Promise<?Unit> {
		const units = await this.getNearbyUnitsFromChunk(ctx, unit.location.chunkHash[0]);
		this.sortByNearestUnit(units, unit);

		for (const other: Unit of units) {
			if (other.details.owner && unit.details.owner !== other.details.owner) {
				return other;
			}
		}

		return null;
	}

	// only for debugging purposes
	async advanceTick(ctx: MonoContext): Promise<void> {
		return this.update(ctx, {
			lastTick: this.lastTick + 1,
			lastTickTimestamp: Date.now(),
		});
	}

	async setPaused(ctx: MonoContext, paused: boolean): Promise<void> {
		return this.update(ctx, { paused });
	}

	async update(ctx: MonoContext, patch: Object): Promise<void> {
		checkContext(ctx, 'update');
		Object.assign(this, patch);
		await ctx.db.map.updateMap(this.name, patch);
	}

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