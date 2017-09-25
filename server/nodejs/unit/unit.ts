
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as r from 'rethinkdb'; //TODO should not be imported in this file
import * as _ from 'lodash';
import Context from '../util/context';
import { checkContext, DetailedError, WrappedError } from '../util/logger';
import env from '../config/env';
import * as groundUnitAI from './ai/groundunit';
import AttackAI from './ai/attack';
import ConstructionAI from './ai/construction';
import * as mineAI from './ai/mine';
import UnitStat from './unitStat';
import PlanetLoc from '../map/planetloc';

import Map from '../map/map';
import Chunk from '../map/chunk';

import { 
	UnitDetails,
	UnitLocation,
	UnitMovable,
	UnitAttack,
	UnitStorage,
	UnitGraphical,
	UnitStationary,
	UnitConstruct
 } from './components';

type ChunkHash = string;
type UUID = string;
type UnitType = string;
type TileHash = string;

type FactoryOrder = {
	type: UnitType,
	cost: number,
	remaining: number
}

export default class Unit {

	uuid: UUID; // set by database
	awake: boolean;

	//components
	details: UnitDetails;
	location: UnitLocation;
	movable: null | UnitMovable;
	attack: null | UnitAttack;
	storage: null | UnitStorage;
	graphical: null | UnitGraphical;
	stationary: null | UnitStationary;
	construct: null | UnitConstruct;


	//constructor will be called with arguments when making a new unit
	//constructor will be called without arguments when initializing from database (database does .clone())
	constructor(ctx: Context, unitType: string = null, map: Map = null, x: number = 0, y: number = 0) {

		//unit will be blank, and should be filled by .clone()
		if (!unitType || !map) {
			return;
		}

		// start off with loading type information
		// to decide what components we will initialize
		const unitStats = ctx.db.unitStats[map.name].get(unitType);
		if (!unitStats) {
			ctx.logger.info(ctx, 'unit stat missing', { unitType });
			throw new Error('unit stats missing');
		}
		_.defaultsDeep(this, unitStats);

		this.details.type = unitType;
		this.awake = true;

		//------------------
		// details init
		this.details.ghosting = false;
		this.details.owner = '';
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
			hash = [x + ':' + y];
			chunkHash = [chunkX + ':' + chunkY];
		} else if (this.details.size === 2) {
			//TODO multi-chunk should have all chunks listed
			chunkHash = [chunkX + ':' + chunkY];
			hash = [
				(x) + ':' + (y), (x + 1) + ':' + (y),
				(x) + ':' + (y + 1), (x + 1) + ':' + (y + 1)
			];
		} else if (this.details.size === 3) {
			//TODO multi-chunk should have all chunks listed
			chunkHash = [chunkX + ':' + chunkY];
			hash = [
				(x - 1) + ':' + (y - 1), (x) + ':' + (y - 1), (x + 1) + ':' + (y - 1),
				(x - 1) + ':' + (y), (x) + ':' + (y), (x + 1) + ':' + (y),
				(x - 1) + ':' + (y + 1), (x) + ':' + (y + 1), (x + 1) + ':' + (y + 1)
			];
		} else {
			throw new DetailedError('invalid unit size', { type: unitType, size: this.details.size });
		}

		this.location = {
			map: map.name,
			x,
			y,
			hash,
			chunkX,
			chunkY,
			chunkHash
		};
		this.initModules();
	}

	initModules() {
		//------------------
		// construct init
		if (this.construct) {
			this.construct.constructing = this.construct.constructing || 0;
			this.construct.factoryQueue = this.construct.factoryQueue || [];
		}

		//------------------
		// attack init
		if (this.attack) {
			this.attack.fireCooldown = this.attack.fireCooldown || 0;
		}

		//------------------
		// storage init
		if (this.storage) {
			this.storage.resourceCooldown = this.storage.resourceCooldown || 0;
			this.storage.iron = this.storage.iron || 0;
			this.storage.fuel = this.storage.fuel || 0;
		}

		//------------------
		// movable init
		if (this.movable) {
			this.movable.movementCooldown = this.movable.movementCooldown || 0;
			this.movable.path = this.movable.path || [];
			this.movable.pathAttempts = this.movable.pathAttempts || 0;
			this.movable.pathAttemptAttempts = this.movable.pathAttemptAttempts || 0;
			this.movable.isPathing = this.movable.isPathing || false;
			this.movable.pathUpdate = this.movable.pathUpdate || 0;
			this.movable.transferGoal = this.movable.transferGoal || null;
		}
	}

	async simulate(ctx: Context): Promise<void> {
		checkContext(ctx, 'simulate');
		//TODO pass context through stuff
		//------------------
		// init
		const map = await this.getMap(ctx);
		const actionPromises = [];
		const actionable = {
			mineAI: false,
			groundUnitAI: false,
			constructionAI: false,
			attackAI: false
		};
		this.initModules();

		//------------------
		//iron and oil should always be off
		if (this.details.type === 'oil' || this.details.type === 'iron') {
			return this.update(ctx, { awake: false });
		}

		//ghosting units don't need to be awake
		if (this.details.ghosting) {
			return this.update(ctx, { awake: false });
		}

		await this.assertLocation(ctx, map);

		//------------------
		// execute actionable promises
		// see what actions are possible
		const profile = ctx.logger.startProfile('unit_AI');

		const attackAI = new AttackAI();
		const constructionAI = new ConstructionAI();

		if (this.details.type === 'mine') {
			actionPromises.push(mineAI.actionable(ctx, this, map)
				.then((result: boolean) => {
					actionable.mineAI = result;
				}).catch((err: Error) => {
					throw new WrappedError(err, 'mine actionable');
				}));
		}
		// flow sucks
		const movable = this.movable;
		if (movable) {

			const mctx = ctx.create();
			mctx.logger = mctx.logger.clone();
			mctx.logger.logLevel = 'DEBUG';

			switch (movable.layer) {
			case 'ground':
				actionPromises.push(groundUnitAI.actionable(mctx, this, map)
					.then((result: boolean) => {
						actionable.groundUnitAI = result;
					}).catch((err: Error) => {
						throw new WrappedError(err, 'groundUnitAI actionable');
					}));
			}
		}

		if (this.attack) {
			actionPromises.push(attackAI.actionable(ctx, this, map)
				.then((result: boolean) => {
					actionable.attackAI = result;
				}).catch((err: Error) => {
					throw new WrappedError(err, 'attackAI actionable');
				}));
		}

		if (this.construct) {
			actionPromises.push(constructionAI.actionable(ctx, this, map)
				.then((result: boolean) => {
					actionable.constructionAI = result;
				}).catch((err: Error) => {
					throw new WrappedError(err, 'constructionAI actionable');
				}));
		}
		checkContext(ctx, 'pre actionable');
		try {
			await Promise.all(actionPromises);
		} catch (err) {
			throw new WrappedError(err, 'failed checking actionables');
		}

		checkContext(ctx, 'pre action');
		//------------------
		// actionable map is filled out
		// pick an action to perform
		try {
			if (actionable.mineAI) {
				ctx.logger.info(ctx, 'processing mine', {}, { silent: true });
				await mineAI.simulate(ctx, this, map);
			} else if (actionable.attackAI) {
				ctx.logger.info(ctx, 'processing attack');
				await attackAI.simulate(ctx, this, map);
			} else if (actionable.groundUnitAI) {
				ctx.logger.info(ctx, 'processing ground AI', {}, { silent: true });
				await groundUnitAI.simulate(ctx, this, map);
			} else if (actionable.constructionAI) {
				ctx.logger.info(ctx, 'processing construction');
				await constructionAI.simulate(ctx, this, map);
			} else { // if no action is performed
				ctx.logger.info(ctx, 'sleeping unit');
				await this.update(ctx, { awake: false });
			}
		} catch (err) {
			throw new WrappedError(err, 'failed to perform action', actionable);
		}
		checkContext(ctx, 'post action');
		ctx.logger.endProfile(profile);
	}


	//---------------------------------------------------------------------------
	// mutators
	//---------------------------------------------------------------------------


	async update(ctx: Context, patch: any): Promise<void> {
		checkContext(ctx, 'update');
		// TODO we should also update the unit itself (this breaks currently)
		// Object.assign(this, patch);
		//assume the object will be awake, unless we are setting it false
		patch.awake = patch.awake || patch.awake === undefined;
		await ctx.db.units[this.location.map].updateUnit(ctx, this.uuid, patch);
		this.validate(ctx);
	}

	async delete(ctx: Context): Promise<void> {
		checkContext(ctx, 'delete');
		await this.clearFromChunks(ctx);

		return ctx.db.units[this.location.map].deleteUnit(ctx, this.uuid);
	}

	async assertLocation(ctx: Context, map: Map): Promise<void> {
		const badLocs: PlanetLoc[] = [];
		try {
			const locs: Array<PlanetLoc> = await this.getLocs(ctx);
			for (const loc of locs) {
				const units: Array<Unit> = await loc.getUnits(ctx);
				const unit: null | Unit = _.find(units, (unit: Unit): boolean => {
					return this.uuid === unit.uuid;
				});
				if (!unit) {
					badLocs.push(loc);
				}
			}
			if (badLocs.length !== 0) {
				throw new DetailedError('unit missing from tile', {
					uuid: this.uuid,
					unitHash: JSON.stringify(this.location.hash),
					tileHash: badLocs[0].hash,
				});
			}
		} catch (err) {
			if (this.details.size === 1) {
				let chunkHash: ChunkHash;
				try {
					chunkHash = await ctx.db.chunks[this.location.map].findChunkForUnit(ctx, this.uuid);
				} catch (err) {
					if (err.message === 'unit not found on map') {
						const loc = badLocs[0];
						ctx.logger.info(ctx, 'adding unit back to map, was missing');
						loc.chunk.addUnit(ctx, this.uuid, loc.hash);
						return;
					} else {
						throw err;
					}
				}
				const x: number = parseInt(chunkHash.split(':')[0]);
				const y: number = parseInt(chunkHash.split(':')[1]);
				const chunk: Chunk = await map.getChunk(ctx, x, y);
				await chunk.refresh(ctx, { force: true });
				/*
				// TODO fix this
				for (const loc of Object.keys(unitMap)) {
					if (unitMap[loc] !== this.uuid) {
						continue;
					}
					await this.update(ctx, {
						location: {
							hash: [loc],
							x: parseInt(loc.split(':')[0]),
							y: parseInt(loc.split(':')[1]),
							chunkHash:[chunkHash],
							chunkX: x,
							chunkY: y,
						}
					});
					// throw an error to abort the current action
					throw new Error('fixed unit location');
				}
				throw new WrappedError(err, 'failed to fix unit location', { chunkHash, unitMap: JSON.stringify(unitMap) });
				*/
				throw new WrappedError(err, 'bad unit location', { chunkHash });
			} else {
				throw new WrappedError(err, 'invalid location for multi-tile unit');
			}

		}
	}

	async takeIron(ctx: Context, amount: number): Promise<void> {
		if (!this.storage) {
			throw new DetailedError('unit does not have storage', { uuid: this.uuid, type: this.details.type });
		}
		const table = ctx.db.units[this.location.map].getTable();
		const conn = ctx.db.units[this.location.map].getConn();
		const delta = await table.get(this.uuid).update((self: any): any => {
			return (r.branch as any)(
				self('storage')('iron').ge(amount), {
					storage: {
						iron: self('storage')('iron').sub(amount)
					}
				}, {}
			);
		}, { returnChanges: true }).run(conn);

		if (!this.storage) {
			throw new DetailedError('unit does not have storage', { uuid: this.uuid, type: this.details.type });
		}

		if (delta.replaced === 0) {
			throw new DetailedError('unit was not updated', { uuid: this.uuid, type: this.details.type });
		} else {
			this.storage.iron -= amount;
			if (this.storage.iron != (delta as any).changes[0].new_val.storage.iron) {
				throw new DetailedError('failed to update iron', { uuid: this.uuid, type: this.details.type, amount });
			}
		}
	}

	// TODO success booleans are an awful idea, why did i do this.
	async takeFuel(ctx: Context, amount: number): Promise<void> {
		if (!this.storage) {
			throw new DetailedError('unit does not have storage', { uuid: this.uuid, type: this.details.type });
		}
		const table = ctx.db.units[this.location.map].getTable();
		const conn = ctx.db.units[this.location.map].getConn();
		const delta = await table.get(this.uuid).update((self: any): any => {
			return (r.branch as any)(
				self('storage')('fuel').ge(amount), { storage: { fuel: self('storage')('fuel').sub(amount) } }, {}
			);
		}, { returnChanges: true }).run(conn);

		if (!this.storage) {
			throw new DetailedError('unit does not have storage', { uuid: this.uuid, type: this.details.type });
		}

		if (delta.replaced === 0) {
			throw new DetailedError('unit was not updated', { uuid: this.uuid, type: this.details.type });
		} else {
			this.storage.fuel -= amount;
			if (this.storage.fuel != (delta as any).changes[0].new_val.storage.fuel) {
				throw new DetailedError('failed to update fuel', { uuid: this.uuid, type: this.details.type, amount });
			}
		}
	}


	//TODO: some of the functionality of addiron should be dumped into db/units.js
	//we shouldn't be requiring rethink in this file

	//returns the amount that actually could be deposited
	async addIron(ctx: Context, amount: number): Promise<any> {
		checkContext(ctx, 'addIron');
		if (!this.storage) {
			throw new DetailedError('unit does not have storage', { uuid: this.uuid, type: this.details.type });
		}

		const max = this.storage.maxIron - this.storage.iron;

		if (max <= 0) {
			return 0;
		}
		if (amount > max) {
			this.storage.iron += max;
			await ctx.db.units[this.location.map]
				.updateUnit(ctx, this.uuid, { storage: { iron: r.row('storage')('iron').default(0).add(max) } });
			return max;
		}
		if (amount <= max) {
			this.storage.iron += amount;
			await ctx.db.units[this.location.map]
				.updateUnit(ctx, this.uuid, { storage: { iron: r.row('storage')('iron').default(0).add(amount) } });
			return amount;
		}
	}

	//returns the amount that actually could be deposited
	async addFuel(ctx: Context, amount: number): Promise<any> {
		checkContext(ctx, 'addFuel');
		if (!this.storage) {
			throw new DetailedError('unit does not have storage', { uuid: this.uuid, type: this.details.type });
		}
		const max = this.storage.maxFuel - this.storage.fuel;
		if (max <= 0) {
			return 0;
		}
		if (amount > max) {
			this.storage.fuel += max;
			await ctx.db.units[this.location.map].updateUnit(ctx, this.uuid, { storage: { fuel: r.row('storage')('fuel').default(0).add(max) } });
			return max;
		}
		if (amount <= max) {
			this.storage.fuel += amount;
			await ctx.db.units[this.location.map].updateUnit(ctx, this.uuid, { storage: { fuel: r.row('storage')('fuel').default(0).add(amount) } });
			return amount;
		}
	}

	async addFactoryOrder(ctx: Context, unitType: UnitType): Promise<void> {
		checkContext(ctx, 'addFactoryOrder');

		if (!this.construct) {
			throw new DetailedError('unit cannot construct', { uuid: this.uuid, type: this.details.type });
		}

		const stats = ctx.db.unitStats[this.location.map].get(unitType);
		if (!stats) {
			throw new DetailedError('cannot add invalid factory order', { uuid: this.uuid, type: unitType });
		}

		const order: FactoryOrder = {
			remaining: stats.details.buildTime,
			type: unitType,
			cost: stats.details.cost
		};

		return await ctx.db.units[this.location.map].addFactoryOrder(ctx, this.uuid, order);

	}

	// TODO this should be typed
	async popFactoryOrder(ctx: Context): Promise<any> {
		if (!this.construct) {
			throw new DetailedError('unit cannot construct', { uuid: this.uuid, type: this.details.type });
		}
		const queue = this.construct.factoryQueue;
		const order = queue.shift();
		const construct = {
			factoryQueue: queue
		};
		await this.update(ctx, { construct });

		return order;
	}

	async addPathAttempt(ctx: Context): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		this.movable.pathAttempts++;

		if (this.movable.pathAttempts > env.movementAttemptLimit) {
			const movable = { pathAttempts: this.movable.pathAttempts };
			await this.update(ctx, { movable });
		} else if (this.movable.pathAttemptAttempts > 2) {
			//totally give up on pathing
			await this.clearDestination(ctx);
		} else {
			//blank out the path but leave the destination so that we will re-path
			const movable: Partial<UnitMovable> = {
				pathAttempts: 0,
				isPathing: false,
				path: [],
				pathAttemptAttempts: this.movable.pathAttemptAttempts++
			};
			this.update(ctx, { movable });
		}

	}
	async setTransferGoal(ctx: Context, uuid: UUID, iron: number, fuel: number): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			transferGoal: {
				uuid: uuid,
				iron: iron,
				fuel: fuel
			}
		};
		return this.update(ctx, { movable });
	}

	async clearTransferGoal(ctx: Context): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			transferGoal: {}
		};
		return this.update(ctx, { movable });
	}

	async setDestination(ctx: Context, x: number, y: number): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const hash = x + ':' + y;
		const movable: Partial<UnitMovable> = { destination: hash, isPathing: false, path: [] };
		return await this.update(ctx, { movable });
	}

	async setPath(ctx: Context, path: Array<any>): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const movable = { path: path, isPathing: false };
		return await this.update(ctx, { movable });
	}

	async clearDestination(ctx: Context): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const movable: Partial<UnitMovable> = {
			destination: null,
			isPathing: false,
			path: [],
			pathAttemptAttempts: 0
		};
		return this.update(ctx, { movable });
	}

	async clearPath(ctx: Context): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const movable: Partial<UnitMovable> = {
			isPathing: false,
			path: [],
			pathAttemptAttempts: 0
		};
		return this.update(ctx, { movable });
	}

	async tickMovement(ctx: Context): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		const movable = {
			movementCooldown: this.movable.movementCooldown--
		};
		return await this.update(ctx, { movable });
	}

	async tickFireCooldown(ctx: Context): Promise<void> {
		if (!this.attack) {
			throw new DetailedError('unit can\'t attack', { uuid: this.uuid, type: this.details.type });
		}
		const attack = {
			fireCooldown: this.attack.fireCooldown--
		};
		await this.update(ctx, { attack });
	}

	async armFireCooldown(ctx: Context): Promise<void> {
		if (!this.attack) {
			throw new DetailedError('unit can\'t attack', { uuid: this.uuid, type: this.details.type });
		}
		const attack = {
			fireCooldown: this.attack.fireRate
		};
		await this.update(ctx, { attack });
	}

	async takeDamage(ctx: Context, dmg: number): Promise<void> {
		if (this.details.maxHealth === 0) {
			throw new DetailedError('non-attackable unit attacked', { uuid: this.uuid, type: this.details.type });
		}
		const details = {
			health: this.details.health - dmg
		};
		if (details.health < 0) {
			details.health = 0;
		}
		await this.update(ctx, { details, awake: true });
	}

	async moveToTile(ctx: Context, tile: PlanetLoc): Promise<void> {
		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}
		if (this.details.size !== 1) {
			throw new DetailedError('moving is not supported for large units', { uuid: this.uuid, type: this.details.type });
		}
		console.log('moving unit!');
		if (tile.chunk.units[tile.hash]) {
			ctx.logger.info(ctx, 'unit movement blocked', { hash: tile.hash, uuid: this.uuid});
			await this.clearPath(ctx);
			return;
		}
		await tile.chunk.moveUnit(ctx, this, tile);

		if (!this.movable) {
			throw new DetailedError('unit is not movable', { uuid: this.uuid, type: this.details.type });
		}

		const location = {
			x: tile.x,
			y: tile.y,
			chunkX: tile.chunk.x,
			chunkY: tile.chunk.y,
			hash: [tile.hash],
			chunkHash: [tile.chunk.hash]
		};
		const movable: Partial<UnitMovable> = {
			movementCooldown: this.movable.speed
		};

		if (tile.hash === this.movable.destination) {
			movable.destination = '';
		}

		await this.update(ctx, { location, movable });
	}

	distance(unit: Unit): number {
		const deltaX = Math.abs(this.location.x - unit.location.x);
		const deltaY = Math.abs(this.location.y - unit.location.y);
		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

	//---------------------------------------------------------------------------
	// helpers
	//---------------------------------------------------------------------------

	async validateSync(): Promise<void> {
		//TODO split up async and sync validation work
	}

	async validate(ctx: Context): Promise<void> {
		checkContext(ctx, 'validate');
		// TODO set this back to false sometime
		// was debugging something else and this function gave errors
		if (env.debug) {
			return;
		}
		await this.refresh(ctx);

		const invalid = (reason: string) => {
			throw new Error(this.uuid + ': ' + reason);
		};

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

		const chunks: Array<Chunk> = await this.getChunks(ctx);
		chunks.forEach((chunk: Chunk) => {
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
				invalid('bad tileHash: ' + tileHash);
			}
			Number(tileHash.split(':')[0]);
			Number(tileHash.split(':')[1]);

		}

		const planetLocs: PlanetLoc[] = await this.getLocs(ctx);
		for (const loc of planetLocs) {
			await loc.validate();
		}

		const map = await this.getMap(ctx);
		for (const unitTile of this.location.hash) {
			//skip this check for resources
			if (this.details.type === 'oil' || this.details.type === 'iron') {
				break;
			}

			const tile = await map.getLocFromHash(ctx, unitTile);
			const chunk = tile.chunk;
			const unitMap = await chunk.getUnitsMap(ctx, unitTile);

			if (!unitMap[this.uuid]) {
				//console.log(chunk.units);
				invalid('unit ' + this.uuid + ' missing from hash: ' + unitTile);
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

	async getLocs(ctx: Context): Promise<Array<PlanetLoc>> {
		checkContext(ctx, 'getLocs');
		const promises: Array<Promise<PlanetLoc>> = [];
		const map: Map = await this.getMap(ctx);
		this.location.hash.forEach((hash: TileHash) => {
			const x = Number(hash.split(':')[0]);
			const y = Number(hash.split(':')[1]);
			promises.push(map.getLoc(ctx, x, y));
		});
		return Promise.all(promises);
	}
	async getChunks(ctx: Context): Promise<Array<Chunk>> {
		checkContext(ctx, 'getChunks');
		const promises: Array<Promise<Chunk>> = [];
		const map: Map = await this.getMap(ctx);
		this.location.chunkHash.forEach((hash: TileHash) => {
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
	async addToChunks(ctx: Context): Promise<void> {
		const locs = await this.getLocs(ctx);
		for (const loc of locs) {
			if (this.details.type === 'oil' || this.details.type === 'iron') {
				await loc.chunk.addResource(ctx, this.uuid, loc.hash);
			} else {
				try {
					await loc.chunk.addUnit(ctx, this.uuid, loc.hash);
				} catch (err) {
					throw new WrappedError(err, 'addToChunks addUnit failed', { hash: loc.hash });
				}
			}
		}
	}

	async clearFromChunks(ctx: Context): Promise<void> {
		checkContext(ctx, 'clearFromChunks');
		const locs = await this.getLocs(ctx);
		for (const loc of locs) {
			try {
				await loc.chunk.clearUnit(ctx, this.uuid, loc.hash);
			} catch (err) {
				throw new WrappedError(err, 'clearFromChunks clearUnit failed', { hash: loc.hash });
			}
		}
	}

	async getMap(ctx: Context): Promise<Map> {
		return await ctx.db.map.getMap(ctx,this.location.map);
	}

	// other should be a database document for a unit (or another unit)
	clone(ctx: Context, other: any) {
		for (const key in other) {
			// $FlowFixMe: hiding this issue for now
			(this as any)[key] = _.cloneDeep(other[key]);
		}


		const stats: any = this.getTypeInfo(ctx);
		for (const key in stats) {
			// $FlowFixMe: hiding this issue for now
			(this as any)[key] = _.assign((this as any)[key], stats[key]);
		}
	}

	// this function is to work around flow complaining about possibly null values
	// returned object is a reference to the component on this object, and can be modified.
	// typing info is not preserved when fetching components, unfortunately
	// design pattern is to get the components you want at the start of a function
	// this makes flow happy as then things don't break if a component disappears
	// after an await (however that should probably never happen)
	getComponent(comp: string): any {
		// $FlowFixMe:
		const compObject = (this as any)[comp];
		if (!compObject) {
			throw new DetailedError('bad component', { comp, uuid: this.uuid, type: this.details.type });
		}
		return compObject;
	}

	getTypeInfo(ctx: Context): UnitStat {
		return ctx.db.unitStats[this.location.map].get(this.details.type);
	}

	async refresh(ctx: Context): Promise<void> {
		const fresh: any = await ctx.db.units[this.location.map].getUnit(ctx, this.uuid);
		this.clone(ctx, fresh);
	}
}