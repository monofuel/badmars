/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const r = require('rethinkdb');
const db = require('../db/db.js');
const env = require("../config/env.js");
const SimplexNoise = require('simplex-noise');
const _ = require('lodash');
const Alea = require('alea');
const Tiletypes = require('./tiletypes.js');
const Unit = require('../unit/unit.js');
const PlanetLoc = require("./planetloc.js");
const logger = require('../util/logger.js');

import {Map} from './map.js';


type EntityMap = {
	[key: TileHash]: UUID
};

export class Chunk {
	x: number;
	y: number;
	hash: string;
	map: string;
	grid: Array<Array<number>>;
	navGrid: Array<Array<number>>;
	chunkSize: number;
	units: EntityMap;
	resources: EntityMap;
	airUnits: EntityMap;

	constructor(x: ?number, y: ?number, map: ?string) {
		this.x = parseInt(x) || 0;
		this.y = parseInt(y) || 0;
		this.hash = this.x + ":" + this.y;
		this.map = map || 'undefined';
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
	async generate() {
		//console.log('generating chunk ' + this.hash);
		var self = this;
	 	let map = await getMap(this.map);

		var waterFudge = 0.15;
		var smoothness = 4.5;

		var bigNoiseGenerator = new SimplexNoise(new Alea(map.seed));
		var medNoiseGenerator = new SimplexNoise(new Alea(map.seed * 79)); //random prime provided by brian
		var smallNoiseGenerator = new SimplexNoise(new Alea(map.seed * 13)); //random prime provided by kir
		self.chunkSize = map.settings.chunkSize;
		for (let i = 0; i < self.chunkSize + 1; i++) {
			self.grid.push([]);
			let x = (self.x * self.chunkSize) + i;
			for (let j = 0; j < self.chunkSize + 1; j++) {
				let y = (self.y * self.chunkSize) + j;
				//dear god sorry this is so ugly, just porting over the same logic from the last generator that was on the client.
				let height = bigNoiseGenerator.noise2D(x * map.settings.bigNoise, y * map.settings.bigNoise) * map.settings.bigNoiseScale;
				height = height + medNoiseGenerator.noise2D(x * map.settings.medNoise, y * map.settings.medNoise) * map.settings.medNoiseScale;
				height = height + smallNoiseGenerator.noise2D(x * map.settings.smallNoise, y * map.settings.smallNoise) * map.settings.smallNoiseScale;

				if (height - map.settings.waterHeight > -waterFudge && height - map.settings.waterHeight < waterFudge) {
					height = map.settings.waterHeight + waterFudge;
				}
				//@grid[x][y] = Math.round(point * smoothness) / smoothness
				self.grid[i].push(Math.round(height * smoothness) / smoothness);
			}
		}

		//-------------------------------------------------
		//figure out the type of each tile

		for (let i = 0; i < self.chunkSize; i++) {
			self.navGrid.push([]);
			for (let j = 0; j < self.chunkSize; j++) {
				var corners = [
                      self.grid[i][j],
                      self.grid[i + 1][j],
                      self.grid[i][j + 1],
                      self.grid[i + 1][j + 1]
                  ];

				var underwater = 0;
				var avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;

				var type = Tiletypes.LAND;
				for (let k of corners) {
					if (Math.abs(k - avg) > map.settings.cliffDelta) {
						type = Tiletypes.CLIFF;
						break;
					} else if (k < map.settings.waterHeight) {
						underwater++;
					}
				}
				if (underwater == 4) {
					type = Tiletypes.WATER;
				} else if (underwater > 0) {
					type = Tiletypes.COAST;
				}

				self.navGrid[i].push(type);
			}
		}
		//-------------------------------------------------
		//spawn resources
		var resourceAlea = new Alea(map.seed * this.x * this.y);
		for (let i = 0; i < self.chunkSize; i++) {
			let x = (self.x * self.chunkSize) + i;
			for (let j = 0; j < self.chunkSize; j++) {
				let y = (self.y * self.chunkSize) + j;

				if (self.navGrid[i][j] != Tiletypes.LAND) {
					continue;
				}

				if (resourceAlea() < map.settings.ironChance) {
					//console.log('spawning iron');
					let unit = new Unit('iron', map, x, y);
					unit = await map.spawnUnitWithoutTileCheck(unit);
					if (!unit) {
						logger.info('failed to spawn iron');
					} else {
						self.resources[unit.tileHash[0]] = unit.uuid;
					}

				} else if (resourceAlea() < map.settings.oilChance) {
					//console.log('spawning oil');
					let unit = new Unit('oil', map, x, y);
					unit = await map.spawnUnitWithoutTileCheck(unit);
					if (!unit) {
						logger.info('failed to spawn oil');
					} else {
						self.resources[unit.tileHash[0]] = unit.uuid;
					}
				}
			}
		}
	}

	save() {
		var self = this;
		return self.generate().then(() => {
			console.log('saving new chunk');
			return db.chunks[self.map].saveChunk(self);
		});
	}

	isValid() {
		if (this.grid.length != this.chunkSize + 1) {
			return false;
		}
		if (this.grid.length > 0) {
			if (this.grid[0].length != this.chunkSize + 1) {
				return false;
			}
		}

		//TODO check if map chunk size changed

		//while stress testing, always re-generate chunks
		return !env.stressTest;
	}

	async getUnitsMap(hash: TileHash): Promise<UnitMap> {
		await this.refresh();
		const uuids = [];
		let uuid = this.units[hash];
		if (uuid) {
			uuids.push(uuid);
		}

		uuid = this.resources[hash];
		if (uuid) {
			console.log('resource',uuid);
			uuids.push(uuid);
		}

		uuid = this.airUnits[hash];
		if (uuid) {
			uuids.push(uuid);
		}
		return db.units[this.map].getUnitsMap(uuids);

	}

	async getUnits(): Promise<Array<Unit>> {

		//this.findAndFixUnits();
		await this.refresh();
		const unitUuids = _.union(_.map(this.resources),_.map(this.units),_.map(this.airUnits));

		//fast units list
		return db.units[this.map].getUnits(unitUuids);

		//slow units list
		//return await  db.units[this.map].getUnitsAtChunk(this.x,this.y);
	}

	async update(patch: any): Promise<Object> {
		return db.chunks[this.map].update(this.hash, patch);
	}

	async moveUnit(unit: Unit,newHash: TileHash): Promise<Success> {
		console.log('new hash:',newHash);
		console.log('old hash:',unit.tileHash[0]);
		let table = db.chunks[this.map].getTable();
		let conn = db.chunks[this.map].getConn();
		let mapUpdate = {};
		mapUpdate[unit.tileHash[0]] = null;
		mapUpdate[newHash] = unit.uuid;
		let delta = await table.get(this.hash).update((self) => {
			return r.branch(
				self('units').hasFields(unit.tileHash[0]),
				{},
				self.merge({units:mapUpdate}).without({units: unit.tileHash[0]})
			)
		},{returnChanges:true}).run(conn);
		if (delta.replaced === 0) {
			return false;
		}
		let newChunk = delta.changes[0].new_val;
		if (unit.uuid !== newChunk.units[newHash]) {
			console.log('wrong new position',newHash,unit.uuid,newChunk[newHash]);
		}
		return delta.replaced === 1;
	}

	async addUnit(uuid: UUID,tileHash: TileHash): Promise<Success> {
		let unitUpdate = {};
		unitUpdate[tileHash] = uuid;
		this.units[tileHash] = uuid;
		const delta = await this.update({units: unitUpdate});
		if (delta.replaced === 0) {
			console.log('failed adding unit to chunk');
			console.log(delta);
			return false;
		}

		const newChunk = delta.changes[0].new_val;
		if (uuid !== newChunk.units[tileHash]) {
			console.log('wrong new position',tileHash,'expected',uuid,'found',newChunk.units[tileHash]);
			console.log('old',this.units);
			console.log('new',newChunk.units);
		}
		if (delta.changes[0].old_val.units.length != 1 + newChunk.units.length) {
			console.log('wrong number of units on chunk');
			//delete old unit
			//const oldUnitUUID = delta.changes[0].old_val.units[tileHash]
			//console.log('deleting old unit',oldUnitUUID);
			//db.units[this.map].deleteUnit(oldUnitUUID);
		}
		return delta.replaced === 1;
	}


	async addResource(uuid: UUID,tileHash: TileHash): Promise<Success> {
		let unitUpdate = {};
		unitUpdate[tileHash] = uuid;
		this.resources[tileHash] = uuid;
		const delta = await this.update({'resources': unitUpdate});
		if (delta.replaced === 0) {
			return false;
		}
		const newChunk = delta.changes[0].new_val;
		if (uuid !== newChunk.resources[tileHash]) {
			console.log('wrong new position',tileHash,'expected',uuid,'found',newChunk.resources[tileHash]);
			console.log('old',this.resources);
			console.log('new',newChunk.resources);
			console.log(tileHash,uuid);
			console.log('chunkHash',this.hash);
		}
		if (delta.changes[0].old_val.resources.length != 1 + newChunk.resources.length) {
			console.log('wrong number of units on chunk');
			//delete old unit
			const oldUnitUUID = delta.changes[0].old_val.units[tileHash]
			if (oldUnitUUID) {
				console.log('deleting old unit',oldUnitUUID);
				await db.units[this.map].deleteUnit(oldUnitUUID);
			} else {
				console.log('failed to find duplicate unit on tile');
				console.log('changes:',JSON.stringify(delta.changes));
			}
		}
		return delta.replaced === 1;
	}
	async validate(): Promise<*> {
		if (!env.debug) {
      return;
    }
		await this.refresh();

		const invalid = (reason) => {
			throw new Error(this.hash + ': ' + reason);
		}

		if (this.x == null) {
			invalid('bad chunk x');
		}
		if (this.y == null) {
			invalid('bad chunk y');
		}
		if (!this.hash) {
			invalid('missing chunk hash');
		}
		if (this.hash.split(":").length !== 2) {
			invalid('bad chunk hash: ' + this.hash);
		}
		if (!this.map) {
			invalid('bad map');
		}
		if (this.chunkSize == null) {
			invalid('missing chunk size');
		}
		if (this.grid.length !== this.chunkSize + 1) {
			invalid('bad chunk grid: ' + this.grid.length + ':' + (this.chunkSize + 1));
		}
		for (const row of this.grid) {
			if (row.length !== this.chunkSize + 1) {
				invalid('bad row length');
			}
		}
		if (this.navGrid.length !== this.chunkSize) {
			invalid('bad chunk nav grid: ' + this.navGrid.length + ':' + (this.chunkSize));
		}
		for (const row of this.navGrid) {
			if (row.length !== this.chunkSize) {
				invalid('bad nav row length');
			}
		}

		_.each(this.units, (uuid, tileHash) => {
			const unit = db.units[this.map].getUnit(uuid);
			if (!unit) {
				invalid('no unit at tile: ' + tileHash);
			}
			if (unit.type === 'mine') {
				if (!this.resources[tileHash]) {
					invalid('mine must be over a resource: ' + tileHash);
				}
			}
		});

		_.each(this.resources, (uuid, tileHash) => {
			const unit = db.units[this.map].getUnit(uuid);
			if (!unit) {
				invalid('no unit at tile: ' + tileHash);
			}
		});

		_.each(this.airUnits, (uuid, tileHash) => {
			const unit = db.units[this.map].getUnit(uuid);
			if (!unit) {
				invalid('no unit at tile: ' + tileHash);
			}
		});

	}
	clone(object: any) {
		for (let key in object) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(object[key]);
		}
		this.x = parseInt(this.x);
		this.y = parseInt(this.y);
	}

	async refresh() {
		const fresh = await db.chunks[this.map].getChunk(this.x,this.y);
		this.clone(fresh);
	}

	async getMap():Promise<Map> {
		return db.map.getMap(this.map);
	}

	async getTiles():Promise<Array<PlanetLoc>> {
		//TODO should cache or parallelize this
		var tiles = [];
		for (let i = 0; i < this.chunkSize; i++) {
			for (let j = 0; j < this.chunkSize; j++) {
				var x = i + (this.x * this.chunkSize);
				var y = j + (this.y * this.chunkSize);
				tiles.push(new PlanetLoc(await this.getMap(this.map),this,x,y));
			}
		}
		return tiles;
	}
}

function getMap(mapName: string): Map {
	return db.map.getMap(mapName);
}
