
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
// const grpc = require('grpc');
const Alea = require('alea');

import logger, { WrappedError } from '../logger';
import Context from '../context';
import db from '../db';
import env from '../config/env';
import { LAND } from './tiletypes';
import { newChunk, planetLocsForChunk, listChunkUnits } from './chunk';
import PlanetLoc, { getLocationDetails } from './planetloc';
import { newUnit, sendResource, unitDistance, getUnitLocs, addToChunks, clearFromChunks } from '../unit/unit';
import Client from '../net/client';
import sleep from '../util/sleep';
import { generateChunk, generateResources } from './procedures';
import User from '../user';

type TileHash = string;
type ChunkHash = string;

type UnitMap = {
	[key: string]: Unit
}

/*
const services = grpc.load(__dirname + '/../../../protos/chunk.proto').services;
const mapClient = new services.Map(env.mapHost + ':' + env.mapPort, grpc.credentials.createInsecure());
*/

const defaultSettings = {
	chunkSize: parseInt(process.env.CHUNK_SIZE) || 16,
	waterHeight: 0,
	cliffDelta: 0.7,
	water: true,
	bigNoise: 0.005,
	medNoise: 0.037,
	smallNoise: 0.1,
	bigNoiseScale: 20,
	medNoiseScale: 6,
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
	settings: any;
	lastTickTimestamp: number;
	lastTick: number;
	tps: number;
	users: Array<any>;
	seed: number;
	paused: boolean;

	constructor(name: string = '', seed: number = Math.random()) {
		if (!name) {
			return; // null constructor for database
		}
		this.name = name;
		this.settings = _.cloneDeep(defaultSettings);
		this.lastTickTimestamp = (new Date()).getTime();
		this.lastTick = 0;
		this.tps = 2;
		this.users = [];
		this.seed = seed;
		this.paused = false;
	}

	async getChunk(ctx: Context, hash: ChunkHash): Promise<Chunk> {
		const planetDB = await db.getPlanetDB(ctx, this.name);
		const chunk = await planetDB.chunk.get(ctx, hash);
		if (chunk) {
			return chunk;
		}
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		const res = await generateChunk(ctx, this, x, y);
		await planetDB.chunk.create(ctx, res.chunk);
		await planetDB.chunkLayer.create(ctx, res.chunkLayer);
		await generateResources(ctx, this, res.chunk, res.chunkLayer);
		return res.chunk;

	}

	async getChunkOld(ctx: Context, x: number, y: number): Promise<Chunk> {
		const planetDB = await db.getPlanetDB(ctx, this.name);
		const chunk = await planetDB.chunk.get(ctx, `${x}:${y}`);
		if (chunk) {
			return chunk;
		}
		const res = await generateChunk(ctx, this, x, y);
		await planetDB.chunk.create(ctx, res.chunk);
		await planetDB.chunkLayer.create(ctx, res.chunkLayer);
		await generateResources(ctx, this, res.chunk, res.chunkLayer);
		return res.chunk;

	}

	async getLocFromHash(ctx: Context, hash: TileHash): Promise<PlanetLoc> {
		const x = parseInt(hash.split(':')[0]);
		const y = parseInt(hash.split(':')[1]);
		return await this.getLoc(ctx, x, y);
	}

	async getLoc(ctx: Context, x: number, y: number): Promise<PlanetLoc> {
		const planetDB = await db.getPlanetDB(ctx, this.name);
		ctx.check('getLoc');
		const details = getLocationDetails(x, y, this.settings.chunkSize);

		const chunk: Chunk = await this.getChunkOld(ctx, details.chunkX, details.chunkY);
		const layer = await planetDB.chunkLayer.get(ctx, chunk.hash);
		ctx.check('getLoc end');
		try {
			return new PlanetLoc(this, chunk, layer, details);
		} catch (err) {
			throw new WrappedError(err, 'failed to get planetLoc in getLoc');
		}
	}

	async factoryMakeUnit(ctx: Context, unitType: string, owner: string, x: number, y: number): Promise<null | Unit> {
		const loc = await this.getLoc(ctx, x, y);
		const unit = await newUnit(ctx, unitType, loc);
		unit.details.owner = owner;
		unit.details.ghosting = false;
		return await this.spawnUnit(ctx, unit);
	}

	async spawnUnit(ctx: Context, newUnit: Unit): Promise<Unit> {
		ctx.check('spawnUnit');
		const tiles = await getUnitLocs(ctx, newUnit);
		const badReason = await this.checkValidForUnit(ctx, tiles, newUnit);
		if (badReason) {
			throw new WrappedError(new Error(badReason), 'spawnUnit');
		}
		const unit = await this.spawnAndValidate(ctx, newUnit);
		ctx.check('spawnUnit end');
		return unit;
	}

	//to be used when spawning units on chunks that are not yet generated
	//this prevents a loop of trying to validate against a chunk that
	//is not yet generated (hence infinite loop)
	async spawnUnitWithoutTileCheck(ctx: Context, newUnit: Unit): Promise<Unit> {
		const planetDB = await db.getPlanetDB(ctx, this.name);

		// TODO addToChunks is now loop safe, should refactor this
		const unit = await planetDB.unit.create(ctx, newUnit);
		await addToChunks(ctx, unit);
		return unit;
	}

	async spawnAndValidate(ctx: Context, newUnit: Unit): Promise<Unit> {
		ctx.check('spawnAndValidate');
		const planetDB = await db.getPlanetDB(ctx, this.name);
		const unit: Unit = await planetDB.unit.create(ctx, newUnit);
		try {
			await
				await addToChunks(ctx, unit);
		} catch (err) {
			try {
				await planetDB.unit.delete(ctx, unit.uuid);
			} catch (err) {
				throw new WrappedError(err, 'failed to cleanup with failed spawn in spawnAndValidate');
			}
			throw new WrappedError(err, 'failed to spawn in spawnAndValidate');
		}
		// await unit.validate(ctx);
		ctx.check('spawnAndvalidate end');
		return unit;
	}

	async checkValidForUnit(ctx: Context, tiles: PlanetLoc[], unit: Unit, ignoreMoving: boolean = false): Promise<null | string> {
		//TODO handle air and water units
		for (const tile of tiles) {
			if (tile.tileType !== LAND) {
				return 'tiletype is not land';
			}
		}

		const units: Array<Unit> = [];
		for (const tile of tiles) {
			const units2: Array<Unit> = await this.unitsTileCheck(ctx, tile, unit.details.ghosting);
			for (const unit2 of units2) {
				units.push(unit2);
			}
		}

		if (unit.details.type === 'mine') {
			for (const unit2 of units) {
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

		if (ignoreMoving) {
			let foundMoving = false;
			for (const unit of units) {
				if (unit.movable.destination) {
					foundMoving = true;
				}
			}
			if (!foundMoving) {
				return;
			}
		}

		return 'has another unit';
	}

	async checkOpen(ctx: Context, tile: PlanetLoc): Promise<boolean> {
		ctx.check('checkOpen');
		//TODO handle air units
		return (await this.unitsTileCheck(ctx, tile, false)).length === 0;
	}

	async unitsTileCheck(ctx: Context, tile: PlanetLoc, includeGhosts: boolean = false): Promise<Array<Unit>> {
		//const units = await tile.chunk.getUnits(tile.hash);
		const units: Array<Unit> = await tile.getUnits(ctx);
		if (!includeGhosts) {
			return _.filter(units, (unit: Unit): boolean => { return !unit.details.ghosting; });
		} else {
			return units;
		}
	}

	async spawnUser(ctx: Context, user: User): Promise<void> {
		const planetDB = await db.getPlanetDB(ctx, this.name);
		//find a spawn location
		logger.info(ctx, 'finding spawn location');
		const chunk: Chunk = await this.findSpawnLocation(ctx);
		const random = new Alea(this.seed + chunk.x + chunk.y);

		//spawn units for them on the chunk
		const unitsToSpawn: string[] = [
			'storage', 'builder', 'builder', 'tank', 'tank', 'iron', 'oil', 'transfer_tower', 'factory', 'transport', 'scout'
		];

		const usedTiles: TileHash[] = [];
		const spawnedUnits: Unit[] = [];

		for (const unitType of unitsToSpawn) {
			while (true) {
				let x: number = this.settings.chunkSize * random();
				let y: number = this.settings.chunkSize * random();

				x += this.settings.chunkSize * chunk.x;
				y += this.settings.chunkSize * chunk.y;
				x = Math.round(x);
				y = Math.round(y);

				const loc = await this.getLoc(ctx, x, y);
				let unit = await newUnit(ctx, unitType, loc);

				const tilesToUse: TileHash[] = unit.location.hash;

				// check if the tiles we want to use are already used
				if (_.intersection(usedTiles, tilesToUse).length !== 0) {
					continue;
				}

				const tiles: PlanetLoc[] = await getUnitLocs(ctx, unit);
				let notLand = false;
				for (const tile of tiles) {
					if (tile.tileType !== LAND) {
						notLand = true;
					}
				}
				if (notLand) {
					continue;
				}


				logger.info(ctx, 'spawning unit', { unitType, x, y });

				if (unitType !== 'iron' && unitType !== 'oil') {
					unit.details.owner = user.uuid;
				}
				switch (unitType) {
					case 'storage':
						if (!unit.storage) {
							throw new Error('storage unit missing storage');
						}
						unit.storage.fuel = 1000;
						unit.storage.iron = 1000;
						break;
					default:
						if (unit.storage && unit.storage.maxFuel) {
							unit.storage.fuel = unit.storage.maxFuel;
						}
						break;
				}
				try {
					// https://www.youtube.com/watch?v=eVB8lM-oCSk
					unit = await this.spawnUnit(ctx, unit);
					spawnedUnits.push(unit);

					logger.info(ctx, 'sucessfully spawned', { unitType, x, y });
					usedTiles.push(...unit.location.hash);

					if (unitType === 'iron' || unitType === 'oil') {
						//assumes that if we spawn the iron or oil, we can also spawn a mine
						const mine = await newUnit(ctx, 'mine', loc);
						mine.details.owner = user.uuid;
						try {
							const spawnedMine: Unit = await this.spawnUnitWithoutTileCheck(ctx, mine);
							spawnedUnits.push(spawnedMine);
						} catch (err) {
							throw new WrappedError(err, `failed to spawn mine for ${unitType}`);
						}
					}
					break;
				} catch (err) {
					for (const unit of spawnedUnits) {
						try {
							const locs = await getUnitLocs(ctx, unit);
							for (const loc of locs) {
								try {
									await clearFromChunks(ctx, unit);
								} catch (err) {
									// NOOP
								}
							}
						} catch (err) {
							logger.trackError(ctx, new WrappedError(err, 'failed to remove unit during rollback unit spawn'));
						}
						try {
							await planetDB.unit.delete(ctx, unit.uuid);
						} catch (err) {
							logger.trackError(ctx, new WrappedError(err, 'failed to delete unit to rollback unit spawn'));
						}
					}
					throw new WrappedError(err, 'spawning unit failed, bailing out', { x, y, unitType });
				}
			}
			for (const unit of spawnedUnits) {
				planetDB.unit.patch(ctx, unit.uuid, unit);
			}
		}
		logger.info(ctx, 'spawn finished');

		await planetDB.addUser(ctx, user.uuid);
	}

	//find random spawn locations, looking farther away depending on how many attempts tried
	//returns a chunk of all free tiles
	async findSpawnLocation(ctx: Context, attempts: number = 0): Promise<Chunk> {
		attempts = attempts || 0;

		const random = new Alea(this.seed * 10 + this.users.length);

		ctx.check('finding spawn location');

		const direction = random() * attempts * 123; //1magic number
		const rotation = random() * Math.PI * 2; //random value between 0 and 2PI

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
		const chunkRange = Math.ceil(tileRange / this.settings.chunkSize);
		return await this.getNearbyUnitsFromChunk(ctx, chunkHash, chunkRange);
	}

	async getNearbyUnitsFromChunk(ctx: Context, chunkHash: ChunkHash, chunkRange: number = 0): Promise<Array<Unit>> {
		ctx.check('getNearbyUnitsFromChunk');
		if (!chunkRange) {
			chunkRange = env.chunkExamineRange;
		}
		const chunkHashes: Array<ChunkHash> = this.getNearbyChunkHashes(chunkHash, chunkRange);
		return await this.getUnitsAtChunks(ctx, chunkHashes);
	}

	async getUnitsAtChunks(ctx: Context, chunkHashes: Array<ChunkHash>): Promise<Array<Unit>> {
		ctx.check('getUnitsAtChunks');
		const units = [];
		for (const chunkHash of chunkHashes) {
			const x: number = parseInt(chunkHash.split(':')[0]);
			const y: number = parseInt(chunkHash.split(':')[1]);
			const chunk: Chunk = await this.getChunkOld(ctx, x, y);
			try {
				const chunkUnits: Array<Unit> = await listChunkUnits(ctx, chunk);

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
	async validChunkForSpawn(ctx: Context, chunk: Chunk): Promise<boolean> {

		const nearbyUnits = await this.getNearbyUnitsFromChunkWithTileRange(ctx, chunk.hash, 32);
		for (const unit of nearbyUnits) {
			if (unit.details.owner !== '') {
				return false;
			}
		}

		const tiles: Array<PlanetLoc> = await planetLocsForChunk(ctx, chunk);

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

	// TODO should have 2 methods
	// one for pulling 'as much as possible' (for pulling fuel)
	// and another for only pulling exact amounts (for construction)
	async pullResource(ctx: Context, type: Resource, taker: Unit, amount: number): Promise<boolean> {
		const planetDB = await db.getPlanetDB(ctx, this.name);

		//TODO should calculate based on transfer range
		let units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, taker.location.chunkHash[0]);
		units = _.filter(units, (unit: Unit) => !!unit.storage);
		this.sortByNearestUnit(units, taker);
		this.sortBuildingsOverOther(units);

		//first check if we can pull enough
		let amountCanPull = 0;
		for (const unit of units) {
			if (taker.uuid === unit.uuid) {
				continue;
			}
			if (!unit.storage) {
				continue;
			}
			if (unit.details.ghosting) {
				continue;
			}
			if (unit.details.owner !== taker.details.owner) {
				continue;
			}
			const distance = unitDistance(unit, taker);

			if (distance > unit.storage.transferRange && distance > taker.storage.transferRange) {
				continue;
			}

			amountCanPull += unit.storage[type];
			if (amountCanPull > amount) {
				break;
			}
		}
		if (amountCanPull < amount) {
			return false;
		}

		const pulledMap: any = {};
		//actually pull Resource
		for (const unit of units) {
			if (unit.details.ghosting) {
				continue;
			}
			if (!unit.storage) {
				continue;
			}

			const pulled = await planetDB.unit.pullResource(ctx, type, amount, unit.uuid);
			if (pulled > 0) {
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
		/*
		if (amount > 0 && Object.keys(pulledMap).length > 0) {
			for (const unit of units) {
				if (pulledMap[unit.uuid]) {
					await unit.addIron(ctx, pulledMap[unit.uuid]);
				}
			}
			return false;
		}
		*/ // TODO
		return true;
	}


	async produceResource(ctx: Context, type: Resource, mine: Unit, amount: number): Promise<void> {

		const planetDB = await db.getPlanetDB(ctx, mine.location.map);

		//TODO should calculate based on transfer range
		const units: Array<Unit> = await this.getNearbyUnitsFromChunk(ctx, mine.location.chunkHash[0]);
		this.sortByNearestUnit(units, mine);
		this.sortBuildingsOverOther(units);

		logger.info(ctx, 'depositing oil from mine', { amount }, { silent: true });

		for (const unit of units) {
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
			const distance = unitDistance(unit, mine);
			if (!unit.storage) {
				continue;
			}

			if (distance > unit.storage.transferRange && distance > mine.storage.transferRange) {
				continue;
			}
			const deposited: number = await planetDB.unit.putResource(ctx, type, amount, unit.uuid);
			amount = amount - deposited;
			if (amount <= 0) {
				break;
			}
			if (amount > 0) {
				const deposited: number = await planetDB.unit.putResource(ctx, type, amount, mine.uuid);
			}
		}

	}

	sortByNearestUnit(units: Array<Unit>, unit: Unit) {
		units.sort((a: Unit, b: Unit): number => {
			return unitDistance(a, unit) - unitDistance(b, unit);
		});
	}

	sortBuildingsOverOther(units: Array<Unit>) {
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
	async getNearestFreeTile(ctx: Context, center: PlanetLoc, unit?: Unit, includeGhosts?: boolean): Promise<null | PlanetLoc> {
		ctx.check('getNearestFreeTile');
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
					await tile.N(ctx),
					await tile.S(ctx),
					await tile.E(ctx),
					await tile.W(ctx)
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

	async advanceTick(ctx: Context): Promise<void> {
		return this.update(ctx, { lastTickTimestamp: Date.now(), lastTick: this.lastTick + 1 });
	}

	async setPaused(ctx: Context, paused: boolean): Promise<void> {
		return this.update(ctx, { paused });
	}

	async update(ctx: Context, patch: Object): Promise<void> {
		const planetDB = await db.getPlanetDB(ctx, this.name);

		ctx.check('update');
		Object.assign(this, patch);
		await planetDB.patch(ctx, patch);
	}

	clone(object: any) {
		for (const key in object) {
			(this as any)[key] = _.cloneDeep(object[key]);
		}

		//TODO should probably not do this
		//apply default settings to existing maps
		this.settings = _.cloneDeep(defaultSettings);
	}
}