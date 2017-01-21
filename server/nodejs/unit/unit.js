/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import r from 'rethinkdb'; //TODO should not be imported in this file
import {db} from '../db/db';
import fs from 'fs';
import logger from '../util/logger';
import _ from 'lodash';

import Context from 'node-context';

import env from '../config/env';

import simplePath from '../nav/simplepath';
import astarpath from '../nav/astarpath';

import groundUnitAI from './ai/groundunit';
import attackAI from './ai/attack';
import constructionAI from './ai/construction';
import mineAI from './ai/mine';

import UnitStat from './unit';

import Map from '../map/map';
import Chunk from '../map/chunk';
import PlanetLoc from '../map/planetloc';

export default class Unit {

	uuid: UUID; // set by database
	awake: boolean;

	//components
	details: {
		type: UnitType,
		size: number,
		buildTime: number,
		cost: number,
		health: number,
		maxHealth: number,
		tick: number,
		lastTick: number,
		ghosting: boolean,
		owner: string,
	}
	location: {
		hash: Array < string > ,
		x: number,
		y: number,
		chunkHash: Array < string > ,
		chunkX: number,
		chunkY: number,
		map: string,
	}
	movable: ? {
		layer: MovementLayer,
		speed: number,
		movementCooldown: number,
		path: Array < any > , // TODO look up path type
		pathAttempts: number,
		pathAttemptAttempts: number,
		isPathing: boolean,
		pathUpdate: number,
		destination: ? TileHash,
		transferGoal: Object, // TODO why is this an object
	}
	attack: ? {
		layers: Array < MovementLayer > ,
		range: number,
		damage: number,
		fireRate: number,
		fireCooldown: number,
	}
	storage: ? {
		iron: number,
		fuel: number,
		maxIron: number,
		maxFuel: number,
		transferRange: number,
		resourceCooldown: number,
		transferGoal: ? {
			iron: ? number,
			fuel: ? number
		}
	}
	graphical: ? {
		model: string,
		scale: number,
	}
	stationary: ? {
		layer: MovementLayer,
	}
	construct: ? {
		types: Array < string > ,
		constructing: number,
		factoryQueue: Array < FactoryOrder > ,
	}


	//constructor will be called with arguments when making a new unit
	//constructor will be called without arguments when initializing from database (database does .clone())
	constructor(unitType: ? string, map : ? Map, x : number = 0, y: number = 0) {

		//unit will be blank, and should be filled by .clone()
		if (!unitType || !map) {
			return;
		}

		// start off with loading type information
		// to decide what components we will initialize
		const unitStats = db.unitStats[map.name].get(unitType);
		if (!unitStats) {
			logger.info('unit stat missing', { unitType });
			throw new Error('unit stats missing');
		}
		_.defaultsDeep(this, unitStats);

		this.details.type = unitType;
		this.awake = true;

		//------------------
		// details init
		this.details.ghosting = false;
		this.details.owner = "";
		this.details.health = this.details.maxHealth;

		//------------------
		// location init

		const chunkX = Math.floor(x / map.settings.chunkSize);
		const chunkY = Math.floor(y / map.settings.chunkSize);

		x = Math.round(x);
		y = Math.round(y);

		let hash = [];
		let chunkHash = [];
		this.details.lastTick = 0;
		if (this.details.size === 1) {
			hash = [x + ":" + y];
			chunkHash = [chunkX + ":" + chunkY];
		} else if (this.details.size === 3) {
			//TODO multi-chunk should have all chunks listed
			chunkHash = [chunkX + ":" + chunkY];
			hash = [
				(x - 1) + ":" + (y - 1), (x) + ":" + (y - 1), (x + 1) + ":" + (y - 1),
				(x - 1) + ":" + (y), (x) + ":" + (y), (x + 1) + ":" + (y),
				(x - 1) + ":" + (y + 1), (x) + ":" + (y + 1), (x + 1) + ":" + (y + 1)
			];
		} else {
			logger.errorWithInfo('invalid unit size', { type: unitType, size: this.details.size });
		}

		this.location = {
			map: map.name,
			x,
			y,
			hash,
			chunkX,
			chunkY,
			chunkHash
		}

		//------------------
		// construct init
		if (this.construct) {
			this.construct.constructing = 0;
			this.construct.factoryQueue = [];
		}

		//------------------
		// attack init
		if (this.attack) {
			this.attack.fireCooldown = 0;
		}

		//------------------
		// storage init
		if (this.storage) {
			this.storage.resourceCooldown = 0;
			this.storage.iron = 0;
			this.storage.fuel = 0;
		}

		//------------------
		// movable init
		if (this.movable) {
			this.movable.movementCooldown = 0;
			this.movable.path = [];
			this.movable.pathAttempts = 0;
			this.movable.pathAttemptAttempts = 0;
			this.movable.isPathing = false;
			this.movable.pathUpdate = 0;
			this.movable.transferGoal = {};
		}
	}

	async simulate(ctx: Context) {
		//TODO pass context through stuff
		//------------------
		// init
		this.awake = false;
		const map = await this.getMap(ctx);
		const actionPromises = [];
		const actionable = {
			mineAI: false,
			groundUnitAI: false,
			constructionAI: false,
			attackAI: false
		}

		//------------------
		//iron and oil should always be off
		if (this.details.type === 'oil' || this.details.type === 'iron') {
			return self.update(ctx, { awake: false });
		}

		//ghosting units don't need to be awake
		if (self.ghosting) {
			return self.update(ctx, { awake: false });
		}

		//------------------
		// execute actionable promises
		// see what actions are possible
		const profile = logger.startProfile('unit_AI');

		if (this.details.type === 'mine') {
			actionPromises.push(mineAI.actionable(ctx, self, map)
				.then((result: boolean) => {
					actionable.mineAI = true;
				}));
		}

		if (this.movable) {
			switch (this.movable.layer) {
			case 'ground':
				actionPromises.push(groundUnitAI.actionable(ctx, self, map)
					.then((result: boolean) => {
						actionable.groundUnitAI = true;
					}));
			}
		}

		if (this.attack) {
			actionPromises.push(attackAI.actionable(ctx, self, map)
				.then((result: boolean) => {
					actionable.attackAI = true;
				}));
		}

		if (this.construct) {
			actionPromises.push(constructionAI.actionable(ctx, self, map)
				.then((result: boolean) => {
					actionable.constructionAI = true;
				}));
		}

		await Promise.all(actionPromises);

		//------------------
		// actionable map is filled out
		// pick an action to perform
		if (actionable.mineAI) {
			await mineAI.simulate(ctx, this, map);
		} else if (actionable.constructionAI) {
			//TODO constructionAI should be performed if factoryqueue is ticking
			await constructionAI.simulate(ctx, this, map);
		} else if (actionable.attackAI) {
			await attackAI.simulate(ctx, this, map);
		} else if (actionable.groundUnitAI) {
			await groundUnitAI.simulate(ctx, this, map);
		} else { // if no action is performed
			logger.info('sleeping unit');
			await self.update(ctx, { awake: false });
		}

		logger.endProfile(profile);
	}


	//---------------------------------------------------------------------------
	// mutators
	//---------------------------------------------------------------------------


	async update(ctx: Context, patch: Object) {
		//TODO also update this object
		//assume the object will be awake, unless we are setting it false
		patch.awake = patch.awake || patch.awake === undefined;
		await db.units[this.location.map].updateUnit(this.uuid, patch);
		this.validate();
	}

	async delete() {
		await this.clearFromChunks();
		return db.units[this.location.map].deleteUnit(this.uuid);
	}

	async takeIron(amount: number) {
		if (!this.storage) {
			return logger.errorWithInfo("unit does not have storage", { uuid: this.uuid, type: this.details.type });
		}
		let table = db.units[this.location.map].getTable();
		let conn = db.units[this.location.map].getConn();
		let delta = await table.get(this.uuid).update((self) => {
			return r.branch(
				self('storage.iron').ge(amount), {
					storage: {
						iron: self('storage.iron').sub(amount)
					}
				}, {}
			)
		}, { returnChanges: true }).run(conn);

		if (!this.storage) {
			return logger.errorWithInfo("unit does not have storage", { uuid: this.uuid, type: this.details.type });
		}

		if (delta.replaced === 0) {
			return false;
		} else {
			this.storage.iron -= amount;
			if (this.storage.iron != delta.changes[0].new_val.storage.iron) {
				console.log('IRON UPDATE FAIL');
				console.log(delta.changes[0].new_val);
				logger.errorWithInfo("failed to update iron", { uuid: this.uuid, type: this.details.type, amount });
			}
			return true;
		}
	}

	async takeFuel(amount: number) {
		if (!this.storage) {
			return logger.errorWithInfo("unit does not have storage", { uuid: this.uuid, type: this.details.type });
		}
		let table = db.units[this.location.map].getTable();
		let conn = db.units[this.location.map].getConn();
		let delta = await table.get(this.uuid).update((self) => {
			return r.branch(
				self('storage.fuel').ge(amount), { storage: { fuel: self('storage.fuel').sub(amount) } }, {}
			)
		}, { returnChanges: true }).run(conn);

		if (!this.storage) {
			return logger.errorWithInfo("unit does not have storage", { uuid: this.uuid, type: this.details.type });
		}

		if (delta.replaced === 0) {
			return false;
		} else {
			this.storage.fuel -= amount;
			if (this.storage.fuel != delta.changes[0].new_val.storage.fuel) {
				logger.errorWithInfo("failed to update fuel", { uuid: this.uuid, type: this.details.type, amount });
			}
			return true;
		}
	}


	//TODO: some of the functionality of addiron should be dumped into db/units.js
	//we shouldn't be requiring rethink in this file

	//returns the amount that actually could be deposited
	async addIron(amount: number): Promise < * > {
		if (!this.storage) {
			return logger.errorWithInfo("unit does not have storage", { uuid: this.uuid, type: this.details.type });
		}

		const max = this.storage.maxIron - this.storage.iron;

		if (max <= 0) {
			return 0;
		}
		if (amount > max) {
			this.storage.iron += max;
			await db.units[this.location.map]
				.updateUnit(this.uuid, { storage: { iron: r.row('storage.iron').default(0).add(max) } });
			return max;
		}
		if (amount <= max) {
			this.storage.iron += amount;
			await db.units[this.location.map]
				.updateUnit(this.uuid, { storage: { iron: r.row('storage.iron').default(0).add(amount) } });
			return amount;
		}
	}

	//returns the amount that actually could be deposited
	async addFuel(amount: number): Promise < * > {
		if (!this.storage) {
			return logger.errorWithInfo("unit does not have storage", { uuid: this.uuid, type: this.details.type });
		}
		const max = this.storage.maxFuel - this.storage.fuel;
		if (max <= 0) {
			return 0;
		}
		if (amount > max) {
			this.storage.fuel += max;
			await db.units[this.location.map].updateUnit(this.uuid, { storage: { fuel: r.row('storage.fuel').default(0).add(max) } });
			return max;
		}
		if (amount <= max) {
			this.storage.fuel += amount;
			await db.units[this.location.map].updateUnit(this.uuid, { storage: { fuel: r.row('storage.fuel').default(0).add(amount) } });
			return amount;
		}
	}

	async addFactoryOrder(unitType: UnitType) {

		if (!this.construct) {
			return logger.errorWithInfo("unit cannot construct", { uuid: this.uuid, type: this.details.type });
		}

		const stats = db.unitStats[this.location.map].get(unitType);
		if (!stats) {
			return logger.errorWithInfo("cannot add invalid factory order", { uuid: this.uuid, type: unitType });
		}

		let order = {
			remaining: stats.details.buildTime,
			type: unitType,
			cost: stats.details.cost
		}
		console.log('pushing onto queue:', order);
		return await db.units[this.location.map].addFactoryOrder(this.uuid, order);

	}

	async popFactoryOrder(ctx: Context): Object {
		if (!this.construct) {
			return logger.errorWithInfo("unit cannot construct", { uuid: this.uuid, type: this.details.type });
		}
		const queue = this.construct.factoryQueue;
		let order = queue.shift();
		const construct = {
			factoryQueue: queue
		};
		await this.update(ctx, { construct });

		return order;
	}

	async addPathAttempt(ctx: Context) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		this.movable.pathAttempts++;

		if (this.movable.pathAttempts > env.movementAttemptLimit) {
			const movable = { pathAttempts: this.movable.pathAttempts };
			await this.update(ctx, { movable });
		} else if (this.movable.pathAttemptAttempts > 2) {
			//totally give up on pathing
			await this.clearDestination();
		} else {
			//blank out the path but leave the destination so that we will re-path
			const movable = {
				pathAttempts: 0,
				isPathing: false,
				path: [],
				pathAttemptAttempts: this.movable.pathAttemptAttempts++
			};
			this.update(ctx, { movable });
		}

	}
	async setTransferGoal(ctx: Context, uuid: UUID, iron: number, fuel: number) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			transferGoal: {
				uuid: uuid,
				iron: iron,
				fuel: fuel
			}
		}
		return this.update(ctx, { movable });
	}

	async clearTransferGoal(ctx: Context) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			transferGoal: {}
		}
		return this.update(ctx, { movable });
	}

	async setDestination(ctx: Context, x: number, y: number) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		let hash = x + ":" + y;
		const movable = { destination: hash, isPathing: false, path: [] };
		return await this.update(ctx, { movable });
	}

	async setPath(ctx: Context, path: Array < any > ) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		const movable = { path: path, isPathing: false };
		return await this.update(ctx, { movable })
	}

	async clearDestination(ctx: Context) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			destination: null,
			isPathing: false,
			path: [],
			pathAttemptAttempts: 0
		}
		return this.update(ctx, { movable });
	}

	async tickMovement(ctx: Context) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			movementCooldown: this.movable.movementCooldown--
		}
		return await this.update(ctx, { movable });
	}

	async tickFireCooldown(ctx: Context) {
		if (!this.attack) {
			return logger.errorWithInfo("unit can't attack", { uuid: this.uuid, type: this.details.type });
		}
		const attack = {
			fireCooldown: this.attack.fireCooldown--
		};
		await this.update(ctx, { attack });
	}

	async armFireCooldown(ctx: Context) {
		if (!this.attack) {
			return logger.errorWithInfo("unit can't attack", { uuid: this.uuid, type: this.details.type });
		}
		const attack = {
			fireCooldown: this.attack.fireRate
		};
		await this.update(ctx, { attack });
	}

	async takeDamage(ctx: Context, dmg: number) {
		if (this.details.maxHealth === 0) {
			return logger.errorWithInfo("non-attackable unit attacked", { uuid: this.uuid, type: this.details.type });
		}
		const details = {
			health: this.details.health - dmg
		}
		if (details.health < 0) {
			details.health = 0;
		}
		await this.update(ctx, { details, awake: true });
	}

	async moveToTile(ctx: Context, tile: PlanetLoc) {
		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}
		if (this.details.size !== 1) {
			return logger.errorWithInfo("moving is not supported for large units", { uuid: this.uuid, type: this.details.type });
		}
		const hasMoved = await tile.chunk.moveUnit(ctx, this, tile);

		if (!this.movable) {
			return logger.errorWithInfo("unit is not movable", { uuid: this.uuid, type: this.details.type });
		}

		if (hasMoved) {
			const location = {
				x: tile.x,
				y: tile.y,
				chunkX: tile.chunk.x,
				chunkY: tile.chunk.y,
				hash: [tile.hash],
				chunkHash: [tile.chunk.hash]
			}
			const movable = {
				movementCooldown: this.movable.speed
			}

			await this.update(ctx, { location, movable });
		} else {
			console.log('movement blocked');
		}
		return hasMoved;
	}

	distance(unit: Unit) {
		let deltaX = Math.abs(this.location.x - unit.location.x);
		let deltaY = Math.abs(this.location.y - unit.location.y);
		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

	//---------------------------------------------------------------------------
	// helpers
	//---------------------------------------------------------------------------

	async validateSync() {
		//TODO split up async and sync validation work
	}
	async validate(ctx: Context) {
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
		if (!this.details.type) {
			invalid('missing type');
		}
		//TODO verify type is a valid type
		if (!this.location.map) {
			invalid('missing map name');
		}
		if (!this.details.owner &&
			this.details.type !== 'oil' &&
			this.details.type !== 'iron') {
			invalid('missing owner');
		}

		//TODO verify map is valid
		if (this.location.chunkX == null) {
			invalid('invalid chunkX: ' + this.location.chunkY);
		}
		if (this.location.chunkY == null) {
			invalid('invalid chunkY: ' + this.location.chunkY);
		}

		const chunks = await this.getChunks(ctx);
		chunks.forEach((chunk) => {
			if (!chunk) {
				invalid('chunk missing for unit');
			}
		});

		if (this.location.x == null) {
			invalid('invalid x: ' + this.location.x);
		}
		if (this.location.y == null) {
			invalid('invalid y: ' + this.location.y);
		}

		for (const tileHash of this.location.hash) {
			if (tileHash.split(':').length != 2) {
				invalid("bad tileHash: " + tileHash);
			}
			const x = tileHash.split(':')[0];
			const y = tileHash.split(':')[1];

		}

		const planetLocs = await this.getLocs();
		for (const loc of planetLocs) {
			await loc.validate();
		}

		const map = await this.getMap(ctx)
		for (let unitTile of this.location.hash) {
			//skip this check for resources
			if (this.details.type === 'oil' || this.details.type === 'iron') {
				break;
			}

			const tile = await map.getLocFromHash(ctx, unitTile);
			const chunk = tile.chunk;
			const unitMap = await chunk.getUnitsMap(ctx, unitTile);

			if (!unitMap[this.uuid]) {
				console.log(chunk.units)
				invalid('unit ' + this.uuid + ' missing from hash: ' + unitTile)
					/*
					console.log('fixing');
					const success = await this.addToChunks();
					if (!success) {
						console.log('was not successful');
						/*
						//untested!
						console.log("tile blocked, moving unit")
						//the tile might be blocked, let's try moving this unit
						const freeTile = await map.getNearestFreeTile(tile,this,true)
						console.log('moving from ' + this.tileHash + ' to ' + freeTile.hash);
						const patch = {
							x: freeTile.x,
							y: freeTile.y,
							tileHash: [freeTile.hash],
							chunk: freeTile.chunk.x,
							chunkY: freeTile.chunk.y,
							chunkHash: [freeTile.chunk.hash]
						}
						this.x = freeTile.x;
						this.y = freeTile.y;
						this.tileHash = [freeTile.hash]
						this.chunkX = freeTile.chunk.x;
						this.chunkY = freeTile.chunk.y;
						this.chunkHash = [freeTile.chunk.hash]

						const success = await this.addToChunks();
						if (!success) {
							invalid('unit not added to chunk map, failed to add');
						}
						await this.patch(patch);

					}*/
			}
		}
	}

	async getLocs(ctx: Context): Promise <Array<PlanetLoc>> {
		const promises: Array <Promise<PlanetLoc>> = [];
		const map = await this.getMap(ctx);
		this.location.hash.forEach((hash) => {
			const x = Number(hash.split(':')[0]);
			const y = Number(hash.split(':')[1]);
			promises.push(map.getLoc(ctx, x, y));
		});
		return Promise.all(promises);
	}
	async getChunks(ctx: Context): Promise < Array < Chunk >> {
		const promises: Array <Promise<Chunk>> = [];
		const map = await this.getMap(ctx);
		this.location.chunkHash.forEach((hash) => {
			const x = Number(hash.split(':')[0]);
			const y = Number(hash.split(':')[1]);
			promises.push(map.getChunk(ctx, x, y));
		});
		return Promise.all(promises);
	}

	//TODO: if this fails halfway, it can leave chunks in a bad state.
	//validator will catch this situation.
	//for buildings, we could assume the building's location is correct when
	//fixing chunks. units are not quite so easy.

	//is failing sometimes for factories- hint to a bigger issue
	async addToChunks(ctx: Context): Promise <Success> {
		const locs = await this.getLocs(ctx);
		let success = true;
		for (const loc of locs) {
			let added;
			if (this.details.type === 'oil' || this.details.type === 'iron') {
				added = await loc.chunk.addResource(ctx, this.uuid, loc.hash);
			} else {
				added = await loc.chunk.addUnit(ctx, this.uuid, loc.hash);
				if (!added) {
					console.log('loc.chunk.addUnit failed', loc.hash);
				}
			}
			if (!added) {
				success = false;
			}
		}
		return success;
	}

	async clearFromChunks(ctx: Context): Promise <Success> {
		const locs = await this.getLocs(ctx);
		let success = true;
		for (const loc of locs) {
			const removed = await loc.chunk.clearUnit(this.uuid, loc.hash);
			if (!removed) {
				console.log('loc.chunk.clear failed', loc.hash);
			}
			if (!removed) {
				success = false;
			}
		}
		return success;
	}

	async getMap(ctx: Context): Promise<Map> {
		return await db.map.getMap(ctx,this.location.map);
	}

	// other should be a database document for a unit (or another unit)
	clone(other: any) {
		for (let key in other) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(other[key]);
		}


		const stats = this.getTypeInfo();
		for (let key in stats) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.assign(this[key], stats[key]);
		}
	}

	// this function is to work around flow complaining about possibly null values
	// returned object is a reference to the component on this object, and can be modified.
	// typing info is not preserved when fetching components, unfortunately
	// design pattern is to get the components you want at the start of a function
	// this makes flow happy as then things don't break if a component disappears
	// after an await (however that should probably never happen)
	getComponent(comp: string): Object {
		// $FlowFixMe:
		const compObject = this[comp];
		if (!compObject) {
			logger.errorWithInfo('bad component', { comp, uuid: this.uuid, type: this.details.type });
		}
		return compObject;
	}

	getTypeInfo() {
		return db.unitStats[this.location.map].get(this.details.type);
	}

	async refresh() {
		const fresh = await db.units[this.location.map].getUnit(this.uuid);
		this.clone(fresh);
	}
}