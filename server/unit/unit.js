/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var db = require('../db/db.js');
var fs = require('fs');
const logger = require('../util/logger.js');
const _ = require('lodash');

var env = require('../config/env.js');

var simplePath = require('../nav/simplepath.js');
var astarpath = require('../nav/astarpath.js');

var groundUnitAI = require('./ai/groundunit.js');
var attackAI = require('./ai/attack.js');
var constructionAI = require('./ai/construction.js');
var mineAI = require('./ai/mine.js');

import {Map} from '../map/map.js';
import {Chunk} from '../map/chunk.js';
const PlanetLoc = require('../map/planetloc.js');

try {
var unitStats = JSON.parse(fs.readFileSync('config/units.json').toString());
} catch (err) {
	console.log(err);
}

fs.watchFile("config/units.json", () => {
	console.log('units.json updated, reloading');
	fs.readFile('config/units.json', (err,data) => {
		if (err) {
			return console.log(err);
		}
		unitStats = JSON.parse(data);
	});
});

class Unit {

	uuid: UUID;
	type: UnitType;
	map: string;
	chunkX: number;
	chunkY: number;
	x: number;
	y: number;

	lastTick: Tick;
	tileHash: Array<TileHash>;
	chunkHash: Array<ChunkHash>;

	constructing: number;
	ghosting: boolean;
	ghostCreation: number;
	movementCooldown: number;
	fireCooldown: number;

	owner: UUID;

	health: number;
	iron: number;
	fuel: number;
	path: Array<TileHash>;
	pathAttempts: number;
	pathAttemptAttempts: number;
	isPathing: boolean;
	factoryQueue: Array<Object>; //TODO type this better
	resourceCooldown: number;
	transferGoal: Object;
	awake: boolean;
	pathUpdate: number;
	destination: ?TileHash;

	//unit stats
	size: ?number;
	maxHealth: ?number;
	movementType: ?string;
	ironStorage: ?number;
	fuelStorage: ?number;
	fireRate: ?number;
	speed: ?number;
	size: ?number;


	constructor(unitType: string, map: Map,x: number,y: number) {

		this.type = unitType;
		//uuid is set by DB
		if (map && map.settings) {
			this.chunkX = Math.floor(x / map.settings.chunkSize);
			this.chunkY = Math.floor(y / map.settings.chunkSize);
			this.map = map.name;
		}
		x = Math.round(x);
		y = Math.round(y);

		this.x = x;
		this.y = y;
		this.lastTick = 0;
		this.tileHash = [x + ":" + y];
		this.chunkHash = [this.chunkX + ":" + this.chunkY];

		//TODO optimize values stored on units depending on type
		this.constructing = 0;
		this.ghosting = false;
		this.ghostCreation = 0;
		this.movementCooldown = 0;
		this.fireCooldown = 0;

		this.owner = "";

		var stats = unitStats[unitType];
		if (!stats && unitType && unitType !== 'iron' && unitType !== 'oil') {
			console.log('could not find stats for ' + unitType);
			throw new Error('invalid unitType');
		} else {
			_.assignIn(this,stats);
		}

		if (!this.size || this.size === 1) {
			this.chunkHash = [this.chunkX + ":" + this.chunkY];
			this.tileHash = [x +":" + y];
		} else if (this.size === 3) {
			//TODO multi-chunk should have all chunks listed
			this.chunkHash = [this.chunkX + ":" + this.chunkY];

			this.tileHash = [
				(x-1) +":" + (y-1), (x) +":" + (y-1), (x+1) +":" + (y-1),
				(x-1) +":" + (y), (x) +":" + (y), (x+1) +":" + (y),
				(x-1) +":" + (y+1), (x) +":" + (y+1), (x+1) +":" + (y+1)
			];

		} else {
			console.log('unsupported unit size in config: ' + this.size);
		}


		this.health = this.maxHealth || 0;
		this.iron = 0;
		this.fuel = 0;

		//TODO pathing stuff should probably be stored in it's own table
		this.path = [];
		this.pathAttempts = 0;
		this.pathAttemptAttempts = 0;
		this.isPathing = false;
		this.pathUpdate = 0;

		this.factoryQueue = [];
		this.resourceCooldown = 0;

		this.transferGoal = {};

		this.awake = true;

	}

	async simulate() {
		var self = this;
		self.awake = false; //awake should be updated to true if we need another simulation tick soon

		//either only move, attack or construct. not doing multiple at once.
		let map = await db.map.getMap(this.map);

		let hasActed = false;

		if (self.type === 'oil' || self.type === 'iron') {
			return self.update({awake: false});
		}

		//special one-off AI
		//mines should always be awake
		if (self.type === 'mine' && !self.ghosting) {
			hasActed = true;
			await mineAI.simulate(self,map);
		}
		const profile = logger.startProfile('unit_AI');

		if (!hasActed) {
			switch (self.movementType) {
				case 'ground':
					hasActed = await groundUnitAI.simulate(self,map);
					break;
			}
		}

		if (!hasActed && self.attack && self.range) {
			hasActed = await attackAI.simulate(self,map);
		}

		if (!hasActed && self.construction) {
			hasActed = await constructionAI.simulate(self,map);
		}

		if (self.factoryQueue && self.factoryQueue.length > 0) {
			hasActed = true;
		}
		//if there is no update but the unit will no longer be awake, sleep it
		if (!hasActed) {
			logger.info('sleeping unit');
			await self.update({awake: false});
		}

		logger.endProfile(profile);
	}


	//---------------------------------------------------------------------------
	// mutators
	//---------------------------------------------------------------------------

	async update(patch) {
		return db.units[this.map].updateUnit(this.uuid,patch);
	}

	async delete() {
		return db.units[this.map].deleteUnit(this.uuid);
	}

	async takeIron(amount) {
		let table = db.units[this.map].getTable();
		let conn =  db.units[this.map].getConn();
		let delta = await table.get(this.uuid).update((self) => {
		  return r.branch(
		    self('iron').ge(amount),
		    {iron: self('iron').sub(amount)},
		    {}
		  )
		}, {returnChanges: true}).run(conn);

		if (delta.replaced === 0) {
			return false;
		} else {
			this.iron -= amount;
			if (this.iron != delta.changes[0].new_val.iron) {
				console.log('IRON UPDATE FAIL');
				console.log(delta.changes[0].new_val)
			}
			return true;
		}
	}

	async takeFuel(amount) {
		let table = db.units[this.map].getTable();
		let conn =  db.units[this.map].getConn();
		let delta = await table.get(this.uuid).update((self) => {
		  return r.branch(
		    self('fuel').ge(amount),
		    {fuel: self('fuel').sub(amount)},
		    {}
		  )
		}, {returnChanges: true}).run(conn);

		if (delta.replaced === 0) {
			return false;
		} else {
			this.fuel -= amount;
			if (this.fuel != delta.changes[0].new_val.fuel) {
				console.log('FUEL UPDATE FAIL');
				console.log(delta.changes[0].new_val)
			}
			return true;
		}
	}


	//TODO: some of the functionality of addiron should be dumped into db/units.js
	//we shouldn't be requiring rethink in this file

	//returns the amount that actually could be deposited
	async addIron(amount: number): Promise<*> {
		if (!this.ironStorage) {
			return 0;
		}

		let max = this.ironStorage - this.iron;

		if (max <= 0) {
			return 0;
		}
		if (amount > max) {
			this.iron += max;
			await db.units[this.map].updateUnit(this.uuid,{iron: r.row('iron').default(0).add(max)});
			return max;
		}
		if (amount <= max) {
			this.iron += amount;
			await db.units[this.map].updateUnit(this.uuid,{iron: r.row('iron').default(0).add(amount)});
			return amount;
		}
	}

	//returns the amount that actually could be deposited
	async addFuel(amount: number): Promise<*> {
		if (!this.fuelStorage) {
			return 0;
		}

		let max = this.fuelStorage - this.fuel;
		if (max === 0) {
			return 0;
		}
		if (amount > max) {
			this.fuel += max;
			await db.units[this.map].updateUnit(this.uuid,{fuel: r.row('fuel').default(0).add(max)});
			return max;
		}
		if (amount <= max) {
			this.fuel += amount;
			await db.units[this.map].updateUnit(this.uuid,{fuel: r.row('fuel').default(0).add(amount)});
			return amount;
		}
	}

	async addFactoryOrder(unitType) {

		if (!this.movementType === 'building') {
			return false;
		}

		if (!this.construction) {
			return false;
		}

		let stats = unitStats[unitType];
		if (!stats) {
			return false;
		}

		let order = {
			remaining: stats.buildTime,
			type: unitType,
			cost: stats.cost
		}
		console.log('pushing onto queue:',order);
		return await db.units[this.map].addFactoryOrder(this.uuid,order);

	}

	async popFactoryOrder() {
		let order = this.factoryQueue.shift();
		await db.units[this.map].updateUnit(this.uuid,{factoryQueue: this.factoryQueue});

		return order;
	}

	async addPathAttempt() {
		this.pathAttempts++;

		if (this.pathAttempts > env.movementAttemptLimit) {
			await db.units[this.map].updateUnit(this.uuid,{pathAttempts: this.pathAttempts});
		} else if (this.pathAttemptAttempts > 2) {
			//totally give up on pathing
			await this.clearDestination();
		} else {
			//blank out the path but leave the destination so that we will re-path
			this.pathAttemptAttempts++;
			await db.units[this.map].updateUnit(this.uuid,{
				pathAttempts: 0,
				isPathing: false,
				awake: true,
				path: [],
				pathAttemptAttempts: this.pathAttemptAttempts
			});
		}

	}
	async setTransferGoal(uuid,iron,fuel) {
		this.transferGoal = {
			uuid: uuid,
			iron: iron,
			fuel: fuel
		}
		return this.updateUnit({transferGoal: this.transferGoal});
	}

	async clearTransferGoal() {
		this.transferGoal = {};
		return this.updateUnit({transferGoal: this.transferGoal});
	}

	async setDestination(x,y) {
		let hash = x + ":" + y;
		this.destination = hash;
		return db.units[this.map].updateUnit(this.uuid,{destination: hash, isPathing: false, path: []});
	}

	async setPath(path) {
		//console.log('setting path: ', path);
		this.path = path;
		return db.units[this.map].updateUnit(this.uuid,{path: path, isPathing: false, awake: true});
	}

	async clearDestination() {
		return db.units[this.map].updateUnit(this.uuid,{destination: null, isPathing: false, path: [], pathAttemptAttempts: 0});
	}

	async updateUnit(patch) {
		return db.units[this.map].updateUnit(this.uuid,patch);
	}

	async tickMovement() {
		if (this.movementCooldown > 0) {
			this.movementCooldown--;
			await db.units[this.map].updateUnit(this.uuid,{movementCooldown: this.movementCooldown});
			return true;
		} else {
			return false;
		}
	}

	async tickFireCooldown() {
		if (this.fireCooldown > 0) {
			this.fireCooldown--;
			await this.updateUnit({fireCooldown: this.fireCooldown});
		}
	}

	async armFireCooldown() {
		if (!this.fireRate) {
			return;
		}
		this.fireCooldown = this.fireRate;
		await this.updateUnit({fireCooldown: this.fireCooldown});
	}

	async takeDamage(dmg) {
		this.health -= dmg;
		if (this.health < 0) {
			this.health = 0;
		}
		await (this.updateUnit({health: this.health, awake:true}));
	}

	async moveToTile(tile) {
		//TODO there is a hole between checking the tile and upating the unit.
		//this will need some sort of work-around as rethink doesn't do transactions.
		let validMove = await tile.map.checkValidForUnit(tile,this);
		//let validMove = true;
		//console.log('validMove: ' + validMove);
		if (!validMove) {
			return false;
		} else {
			const success = await tile.chunk.moveUnit(this,tile.hash);
			console.log('movement:',success);

			this.x = tile.x;
			this.y = tile.y;
			this.chunkX = tile.chunk.x;
			this.chunkY = tile.chunk.y;
			this.tileHash = [tile.hash];
			this.chunkHash = [tile.chunk.hash];
			if (!this.speed) {
				throw new Error('tried to move unit without speed: ' + this.uuid);
			}
			this.movementCooldown = this.speed;

			//TODO update chunk hash
			await db.units[this.map].updateUnit(this.uuid,
				{
					x: this.x,
					y: this.y,
					chunkX: this.chunkX,
					chunkY: this.chunkY,
					tileHash: this.tileHash,
					chunkHash: this.chunkHash,
					movementCooldown: this.movementCooldown
				}
			);
			//console.log('moved');
		}
		return true;
	}

	distance(unit) {
		let deltaX = Math.abs(this.x - unit.x);
		let deltaY = Math.abs(this.y - unit.y);
		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

	//---------------------------------------------------------------------------
	// helpers
	//---------------------------------------------------------------------------

	async validate() {
		if (!env.debug) {
      return;
    }
		await this.refresh();

		const invalid = (reason) => {
			throw new Error(this.uuid + ': ' + reason);
		}

		if (!this.uuid) {
			invalid('missing uuid');
		}
		if (!this.type) {
			invalid('missing type');
		}
		//TODO verify type is a valid type
		if (!this.map) {
			invalid ('missing map name');
		}
		if (!this.owner && this.type !== 'oil' && this.type !== 'iron') {
			invalid ('missing owner');
		}

		//TODO verify map is valid
		if (this.chunkX == null) {
			invalid('invalid chunkX: ' + this.chunkY);
		}
		if (this.chunkY == null) {
			invalid('invalid chunkY: ' + this.chunkY);
		}
		const chunk = await db.chunks[this.map].getChunk(this.chunkX,this.chunkY);
		if (!chunk) {
			//invalid('unit chunk does not exist');
		}

		if (this.x == null) {
			invalid('invalid x: ' + this.x);
		}
		if (this.y == null) {
			invalid('invalid y: ' + this.y);
		}

		for (const tileHash of this.tileHash) {
			if (tileHash.split(':').length != 2) {
				invalid("bad tileHash: " + tileHash);
			}
			const x = tileHash.split(':')[0];
			const y = tileHash.split(':')[1];

		}

		if (this.size == 1) {
			const planetLoc = await this.getLoc();
			await planetLoc.validate();
		}
		console.log('checking locs');
		const planetLocs = await this.getLocs();
		for (const loc of planetLocs) {
			await loc.validate();
		}

		const unitsFromChunk = await chunk.getUnitsMap(this.tileHash[0]);
		if (!unitsFromChunk[this.uuid]) {
			for (const tileHash of this.tileHash) {
				console.log('adding unit to chunk map');
				await this.addToChunks();
			}
			invalid('unit not found on chunk map');
		}

	}

	async getLoc(): Promise<PlanetLoc> {
		if (!this.size || this.size > 1) {
			throw new Error('getloc called on large unit');
		}
		const map = await db.map.getMap(this.map);
		return map.getLoc(this.x,this.y);
	}

	async getLocs(): Promise<Array<PlanetLoc>> {
		const promises:Array<Promise<PlanetLoc>> = [];
		const map = await db.map.getMap(this.map);
		for (const tileHash of this.tileHash) {
			const x = tileHash.split(':')[0];
			const y = tileHash.split(':')[1];
			promises.push(map.getLoc(x,y));
		}
		return Promise.all(promises);
	}

	async addToChunks() {
		const locs = await this.getLocs();
		for (const loc of locs) {
			if (this.type === 'oil' || this.type === 'iron') {
				await loc.chunk.addResource(this.uuid,loc.hash);
			} else {
				await loc.chunk.addUnit(this.uuid,loc.hash);
			}
		}
	}

	clone(object) {
		for (let key in object) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(object[key]);
		}
		var stats = unitStats[this.type];
		for (let key in stats) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(object[key]);
		}
	}

	async refresh() {
		const fresh = await db.units[this.map].getUnit(this.uuid);
		this.clone(fresh);
	}

	getTypeInfo(type) {
		return unitStats[type];
	}

}

module.exports = Unit;
