
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
const Alea = require('alea');
import * as r from 'rethinkdb';
const SimplexNoise = require('simplex-noise');

import env from '../config/env';
import { DetailedError, checkContext } from '../util/logger';
import Context from '../util/context';
import Unit from '../unit/unit';
import PlanetLoc, { getLocationDetails } from './planetloc';
import { LAND, CLIFF, WATER, COAST } from './tiletypes';

import DBChunk from '../db/chunk';
import DBUnit from '../db/unit';
import Map from './map';

type TileHash = string;
type UUID = string;
type TileCode = number;

type EntityMapType = {
	[key: string]: UUID
};

type UnitMap = {
	[key: string]: Unit
}



export default class Chunk {
	x: number;
	y: number;
	hash: string;
	map: string;
	tick: number;
	grid: Array<Array<number>> ;
	navGrid: Array<Array<TileCode>> ;
	chunkSize: number;
	units: EntityMapType;
	resources: EntityMapType;
	airUnits: EntityMapType;

	constructor(map: string, x: number, y: number) {
		if (!map) {
			throw new Error('chunk missing map');
		}
		this.x = parseInt(x as any) || 0;
		this.y = parseInt(y as any) || 0;
		this.hash = this.x + ':' + this.y;
		this.map = map;
		this.grid = []; //grid size should be chunkSize + 1
		this.navGrid = []; //tile size should be chunkSize
		this.chunkSize = 16;

		//units for each 'layer' of combat
		this.units = {}; //tilehash unit uuid pairs
		this.resources = {};
		this.airUnits = {};
	}

	//TODO should be refactored neater
	//the old server never actually did world generation and left it to the client.
	async generate(ctx: Context): Promise<void> {
		checkContext(ctx, 'generate');
		//console.log('generating chunk ' + this.hash);
		const map = await this.getMap(ctx);

		const waterFudge = 0.15;
		const smoothness = 4.5;

		const bigNoiseGenerator = new SimplexNoise(new Alea(map.seed));
		const medNoiseGenerator = new SimplexNoise(new Alea(map.seed * 79)); //random prime provided by brian
		const smallNoiseGenerator = new SimplexNoise(new Alea(map.seed * 13)); //random prime provided by kir
		this.chunkSize = map.settings.chunkSize;
		for (let i = 0; i < this.chunkSize + 1; i++) {
			this.grid.push([]);
			const x = (this.x * this.chunkSize) + i;
			for (let j = 0; j < this.chunkSize + 1; j++) {
				checkContext(ctx, 'generating chunk tiles');
				const y = (this.y * this.chunkSize) + j;
				//dear god sorry this is so ugly, just porting over the same logic from the last generator that was on the client.
				let height = bigNoiseGenerator.noise2D(x * map.settings.bigNoise, y * map.settings.bigNoise) * map.settings.bigNoiseScale;
				height = height + medNoiseGenerator.noise2D(x * map.settings.medNoise, y * map.settings.medNoise) * map.settings.medNoiseScale;
				height = height + smallNoiseGenerator.noise2D(x * map.settings.smallNoise, y * map.settings.smallNoise) * map.settings.smallNoiseScale;

				if (height - map.settings.waterHeight > -waterFudge && height - map.settings.waterHeight < waterFudge) {
					height = map.settings.waterHeight + waterFudge;
				}
				//@grid[x][y] = Math.round(point * smoothness) / smoothness
				this.grid[i].push(Math.round(height * smoothness) / smoothness);
			}
		}

		//-------------------------------------------------
		//figure out the type of each tile

		for (let i = 0; i < this.chunkSize; i++) {
			this.navGrid.push([]);
			for (let j = 0; j < this.chunkSize; j++) {
				checkContext(ctx, 'generating chunk types');
				const corners = [
					this.grid[i][j],
					this.grid[i + 1][j],
					this.grid[i][j + 1],
					this.grid[i + 1][j + 1]
				];

				let underwater = 0;
				const avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;

				let type = LAND;
				for (const k of corners) {
					if (Math.abs(k - avg) > map.settings.cliffDelta) {
						type = CLIFF;
						break;
					} else if (k < map.settings.waterHeight) {
						underwater++;
					}
				}
				if (underwater == 4) {
					type = WATER;
				} else if (underwater > 0) {
					type = COAST;
				}

				this.navGrid[i].push(type);
			}
		}
		//-------------------------------------------------
		//spawn resources
		const resourceAlea = new Alea(map.seed * this.x * this.y);
		for (let i = 0; i < this.chunkSize; i++) {
			const x = (this.x * this.chunkSize) + i;
			for (let j = 0; j < this.chunkSize; j++) {
				checkContext(ctx, 'generating chunk resources');
				const y = (this.y * this.chunkSize) + j;

				if (this.navGrid[i][j] != LAND) {
					continue;
				}

				if (resourceAlea() < map.settings.ironChance) {
					//console.log('spawning iron');
					let unit: Unit = new Unit(ctx, 'iron', map, x, y);
					unit = await map.spawnUnitWithoutTileCheck(ctx, unit);
					if (!unit) {
						ctx.logger.info(ctx, 'failed to spawn iron');
					} else {
						this.resources[unit.location.hash[0]] = unit.uuid;
					}

				} else if (resourceAlea() < map.settings.oilChance) {
					//console.log('spawning oil');
					let unit: Unit = new Unit(ctx, 'oil', map, x, y);
					unit = await map.spawnUnitWithoutTileCheck(ctx, unit);
					if (!unit) {
						ctx.logger.info(ctx, 'failed to spawn oil');
					} else {
						this.resources[unit.location.hash[0]] = unit.uuid;
					}
				}
			}
		}
	}

	async save(ctx: Context): Promise<void> {
		await this.generate(ctx);
		await this.getChunkDB(ctx).saveChunk(ctx, this);
	}

	async getUnitsMap(ctx: Context, hash: TileHash): Promise<UnitMap> {
		checkContext(ctx,'getUnitsMap');
		await this.refresh(ctx);
		const uuids = [];
		let uuid = this.units[hash];
		if (uuid) {
			uuids.push(uuid);
		}

		uuid = this.resources[hash];
		if (uuid) {
			//console.log('resource',uuid);
			uuids.push(uuid);
		}

		uuid = this.airUnits[hash];
		if (uuid) {
			uuids.push(uuid);
		}
		return ctx.db.units[this.map].getUnitsMap(ctx, uuids);
	}

	async getUnits(ctx: Context): Promise<Array<Unit>> {
		checkContext(ctx,'getUnits');
		await this.refresh(ctx);
		const unitUuids: Array<UUID> = _.union(_.map(this.resources), _.map(this.units), _.map(this.airUnits));
		return this.getUnitDB(ctx).getUnits(ctx, unitUuids);
	}

	async update(ctx: Context, patch: any): Promise<Object> {
		return ctx.db.chunks[this.map].update(ctx, this.hash, patch);
	}

	async moveUnit(ctx: Context, unit: Unit, newTile: PlanetLoc): Promise<void> {
		checkContext(ctx, 'moveUnit');
		await this.refresh(ctx);
		const newChunk: Chunk = newTile.chunk;
		const oldTiles = await unit.getLocs(ctx);
		if (oldTiles[0].chunk.units[oldTiles[0].hash] !== unit.uuid) {
			throw new DetailedError('unit not at proper tile', {
				uuid: unit.uuid,
				found: oldTiles[0].chunk.units[oldTiles[0].hash]
			});
		}
		await this.getChunkDB(ctx).setUnit(ctx, newChunk, unit.uuid, newTile.hash);

		await newChunk.refresh(ctx, { force: true });
		if (unit.uuid !== newChunk.units[newTile.hash]) {
			throw new DetailedError('wrong new position', { hash: newTile.hash, uuid: unit.uuid, otherUuid: newChunk.units[newTile.hash] });
		}
		await oldTiles[0].chunk.clearUnit(ctx, unit.uuid, oldTiles[0].hash);
	}

	async clearUnit(ctx: Context, uuid: UUID, tileHash: TileHash): Promise<void> {
		checkContext(ctx, 'clearUnit');
		const table = ctx.db.chunks[this.map].getTable();
		const conn = ctx.db.chunks[this.map].getConn();
		const unitUpdate: any = {};
		unitUpdate[tileHash] = true;
		if (this.units[tileHash] !== uuid) {
			throw new DetailedError('wrong unit at old tile!', { found: this.units[tileHash], expected: uuid });
		}
		delete this.units[tileHash];

		const delta: r.WriteResult = await table.get(this.hash)
			.replace((r.row as any).without({ units: unitUpdate }), { returnChanges: true }).run(conn);
		if (delta.replaced !== 1) {
			throw new DetailedError('failed clearing position', { tileHash });
		} else {
			const newChunk = (delta as any).changes[0].new_val;
			if (newChunk.units[tileHash] === uuid) {
				throw new DetailedError('unit did not get removed from position', { uuid, found: newChunk.units[tileHash]});
			}
		}
	}

	async addUnit(ctx: Context, uuid: UUID, tileHash: TileHash): Promise<void> {
		checkContext(ctx, 'addUnit');
		await this.getChunkDB(ctx).setUnit(ctx, this, uuid, tileHash);

		await this.refresh(ctx);
		if (uuid !== this.units[tileHash]) {
			throw new DetailedError('wrong new position after refresh', { uuid, tileHash, found: this.units[tileHash] });
		}
	}


	async addResource(ctx: Context, uuid: UUID, tileHash: TileHash): Promise<void> {
		checkContext(ctx, 'addResource');
		await this.getChunkDB(ctx).setResource(ctx, this, uuid, tileHash);
		await this.refresh(ctx);
		if (uuid !== this.resources[tileHash]) {
			throw new DetailedError('failed to add resource after refresh', { uuid, tileHash, found: this.resources[tileHash] });
		}
	}

	syncValidate() {
		if (!env.debug) {
			return;
		}
		const invalid = (reason: string) => {
			throw new DetailedError('bad chunk: ' + reason, {
				hash: this.hash,
				x: this.x,
				y: this.y,
			});
		};

		if (this.x == null) {
			invalid('bad chunk x');
		}
		if (this.y == null) {
			invalid('bad chunk y');
		}
		if (!this.hash) {
			invalid('missing chunk hash');
		}
		if (this.hash.split(':').length !== 2) {
			invalid('bad chunk hash: ' + this.hash);
		}
		if (!this.map) {
			invalid('bad map');
		}
		if (this.chunkSize == null) {
			invalid('missing chunk size');
		}
		if (this.grid.length !== this.chunkSize + 1) {
			invalid('bad chunk grid. got ' + this.grid.length + ', expected ' + (this.chunkSize + 1));
		}
		for (const row of this.grid) {
			if (row.length !== this.chunkSize + 1) {
				invalid('bad row length. got ' + row.length + ', expected ' + (this.chunkSize + 1));
			}
		}
		if (this.navGrid.length !== this.chunkSize) {
			invalid('bad chunk nav grid. got ' + this.navGrid.length + ', expected ' + (this.chunkSize));
		}
		for (const row of this.navGrid) {
			if (row.length !== this.chunkSize) {
				invalid('bad nav row length. got ' + row.length + ', expected ' + (this.chunkSize + 1));
			}
		}
	}

	async validate(ctx: Context): Promise<void> {
		checkContext(ctx, 'validate');
		if (!env.debug) {
			return;
		}
		const invalid = (reason: string) => {
			throw new Error(this.hash + ': ' + reason);
		};
		await this.refresh(ctx);

		this.syncValidate();

		for (const tileHash of Object.keys(this.units)) {
			const uuid = this.units[tileHash];
			const unit: Unit = await ctx.db.units[this.map].getUnit(ctx, uuid);
			if (!unit) {
				invalid('no unit at tile: ' + tileHash);
			}
			if (unit.details.type === 'mine') {
				if (!this.resources[tileHash]) {
					invalid('mine must be over a resource: ' + tileHash);
				}
			}
			/*
			if (!_.includes(unit.tileHash, tileHash)) {
				//console.log('unit doesn\'t agree with chunk location. chunk:' + tileHash + ' unit: ' + unit.tileHash);
				//console.log('removing unit from chunk (hope the unit was correct)');


				/*
				// TODO update for getlocs
				const loc = await unit.getLoc();
				await loc.chunk.refresh(ctx);
				if (!this.equals(loc.chunk)) {
					invalid('unit on wrong chunk');
				}
				/*const success = await this.clearUnit(unit.uuid, tileHash);
				if (!success) {
					console.log('failed to remove unit');
				}*/
			//}
		}
		for (const tileHash of Object.keys(this.resources)) {
			const uuid = this.resources[tileHash];
			const unit = await ctx.db.units[this.map].getUnit(ctx, uuid);
			if (!unit) {
				invalid('no unit at tile: ' + tileHash);
			}
		}

		for (const tileHash of Object.keys(this.airUnits)) {
			const uuid = this.resources[tileHash];
			const unit = await ctx.db.units[this.map].getUnit(ctx, uuid);
			if (!unit) {
				invalid('no unit at tile: ' + tileHash);
			}
		}

	}

	equals(other: Chunk): boolean {
		return this.hash === other.hash;
	}

	clone(object: any) {
		for (const key in object) {
			(this as any)[key] = _.cloneDeep(object[key]);
		}
		this.x = parseInt(this.x as any);
		this.y = parseInt(this.y as any);

		if (!this.map) {
			throw new DetailedError('invalid chunk without map', { x: this.x, y: this.y });
		}
		this.syncValidate();
	}

	// chunks can only be refreshed once per tick.
	async refresh(ctx: Context, { force }: { force?: boolean} = {}): Promise<void> {
		if (!force && (ctx.tick && this.tick === ctx.tick)) {
			return;
		}
		checkContext(ctx, 'refresh');

		if (ctx.tick) {
			this.tick = ctx.tick;
		}
		this.syncValidate();
		const fresh: Object = await ctx.db.chunks[this.map].getChunkUnits(ctx, this.x, this.y);

		this.clone(fresh);
		
	}

	async getTiles(ctx: Context): Promise<Array<PlanetLoc>> {
		checkContext(ctx, 'getTiles');
		const map: Map = await this.getMap(ctx);
		const tiles = [];
		for (let i = 0; i < this.chunkSize; i++) {
			for (let j = 0; j < this.chunkSize; j++) {
				const x = i + (this.x * this.chunkSize);
				const y = j + (this.y * this.chunkSize);
				tiles.push(new PlanetLoc(map, this, getLocationDetails(x, y, this.chunkSize)));
			}
		}
		return tiles;
	}
	getChunkDB(ctx: Context): DBChunk {
		return ctx.db.chunks[this.map];
	}
	getUnitDB(ctx: Context): DBUnit {
		return ctx.db.units[this.map];
	}
	async getMap(ctx: Context): Promise<Map> {
		return ctx.db.map.getMap(ctx, this.map);
	}
}