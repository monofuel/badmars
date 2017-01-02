/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import Context from 'node-context';
import r from 'rethinkdb';
import Unit from '../unit/unit';
import env from '../config/env';
import logger from '../util/logger';
import {safeCreateTable, safeCreateIndex, startDBCall, clearSpareIndices} from './db';

const VALID_INDICES = ['location.chunkHash', 'location.hash', 'details.lastTick', 'awake'];

export default class DBunit {
	conn: r.Connection;
	mapName: string;
	table: r.Table;
	tableName: string;

	constructor(connection: r.Connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = mapName + "_unit";
	}

	async init(): Promise<void> {
		this.table = await safeCreateTable(this.tableName, 'uuid');
		await safeCreateIndex(this.table, 'location.hash', true);
		await safeCreateIndex(this.table, 'location.chunkHash', true);
		await safeCreateIndex(this.table, 'details.lastIndex');
		await safeCreateIndex(this.table, 'awake');
		await clearSpareIndices(this.table, VALID_INDICES);
	}

	async each(func: Function) {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err, doc) => {
			if (err) {
				throw err;
			}
			const unit = new Unit();
			unit.clone(doc);
			func(unit);
		}).catch((err) => {
			//dumb rethinkdb bug
			if (err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});
	}

	async listPlayersUnits(ctx: Context, owner: string): Promise<Array<Unit>> {
		const call = await startDBCall(ctx,'listPlayersUnits');
		const cursor = await this.table.filter(r.row('details.owner').eq(owner)).run(this.conn);
		const units = await this.loadUnitsCursor(cursor);
		await call.end();
		return units;
	}

	async addUnit(ctx: Context, unit: Unit) {
		const call = await startDBCall(ctx,'addUnit');
		let delta = await this.table.insert(unit, {
			returnChanges: true
		}).run(this.conn);
		await call.end();
		return await this.loadUnit(delta.changes[0].new_val);
	}

	async getUnit(ctx: Context, uuid: UUID) {
		const call = await startDBCall(ctx,'getUnit');
		let doc = await this.table.get(uuid).run(this.conn);
		if (!doc) {
			console.log('unit not found: ', uuid);
		}
		await call.end();
		return this.loadUnit(doc);
	}
	async getUnits(ctx: Context, uuids: Array < UUID > ) {
		const call = await startDBCall(ctx,'getUnits');
		const promises = [];
		for (const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const docs = await Promise.all(promises);
		await call.check();
		const units = await this.loadUnits(docs);
		await call.end();
		return units;
	}

	async getUnitsMap(ctx: Context, uuids: Array < UUID > ): Promise < UnitMap > {
		const call = await startDBCall(ctx,'getUnitsMap');
		const promises = [];
		for (const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const unitDocs = await Promise.all(promises);
		await call.check();
		const unitMap = {};
		for (let doc of unitDocs) {
			const unit = new Unit();
			unit.clone(doc);
			unitMap[unit.uuid] = unit;
		}
		await call.end();
		return unitMap;
	}

	async updateUnit(ctx: Context, uuid: UUID, patch: Object) {
		const call = await startDBCall(ctx,'updateUnit');
		let result = await this.table.get(uuid).update(patch).run(this.conn);
		await call.end();
		return result;
	}

	async saveUnit(ctx: Context, unit: Unit) {
		const call = await startDBCall(ctx,'saveUnit');
		let result = await this.table.get(unit.uuid).update(unit).run(this.conn);
		await call.end();
		return result;

	};

	async deleteUnit(ctx: Context, uuid: UUID) {
		const call = await startDBCall(ctx,'deleteUnit');
		await this.table.get(uuid).delete().run(this.conn);
		await call.end();
	}

	async getUnitsAtChunk(ctx: Context, x: number, y: number) {
		const call = await startDBCall(ctx,'getUnitsAtChunk');
		const hash = x + ":" + y;
		const unitDocs = await this.table.getAll(hash, {
			index: "chunkHash"
		}).coerceTo('array').run(this.conn);
		await call.check();
		const units: Array < Unit > = [];
		for (let doc: Object of unitDocs) {
			units.push(await this.loadUnit(doc));
		}
		await call.end();
		return units;

	}

	async loadUnits(unitsList: Array <Object> ): Promise <Array<Unit>> {
		const units = [];
		_.each(unitsList, (doc) => {
			units.push(this.loadUnit(doc));
		});

		return Promise.all(units);
	}

	async loadUnitsCursor(cursor: r.Cursor): Promise <Array<Unit>> {
		const units = [];
		await cursor.each((err, doc) => {
			if (err) {
				throw err;
			}
			units.push(this.loadUnit(doc));
		}).catch((err) => {
			//dumb rethinkDB bug
			if (err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});

		return Promise.all(units);
	}

	async loadUnit(doc: Object): Promise <Unit> {
		if (!doc) {
			throw new Error('loadUnit called for null document');
		}
		const profile = logger.startProfile('loadUnit');
		const unit = new Unit();
		unit.clone(doc);
		logger.endProfile(profile);
		return unit;
	}

	async addFactoryOrder(ctx: Context, uuid: UUID, order: FactoryOrder): Promise<void> {
		const call = await startDBCall(ctx,'addFactoryOrder');
		await this.table.get(uuid).update({
			factoryQueue: r.row('factoryQueue').append(order),
			awake: true
		}).run(this.conn);
		await call.end();

	}

	registerPathListener(func: Function) {
		this.table.filter(r.row.hasFields('location.destination'))
			.filter(r.row('location.isPathing').eq(false))
			.filter(r.row('location.path').eq([]))
			.changes().run(this.conn).then((cursor) => {
				cursor.each(func);
			})
	}

	async getUnprocessedPath() {

		let result = await this.table.filter(r.row.hasFields('location.destination'))
			.filter(r.row('location.isPathing').eq(false))
			.filter(r.row('location.path').eq([]))
			.limit(env.pathChunks)
			.update((unit) => {
				return r.branch(
					unit('location.isPathing').eq(false), { location: { isPathing: true, pathUpdate: Date.now() } }, {}
				)
			}, {
				durability: 'hard',
				returnChanges: true
			}).run(this.conn);
		return result;
	}

	getUnprocessedUnits(tick: number): Promise <Array<Unit>> {
		return this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('details.lastTick').lt(tick)).limit(env.unitProcessChunks).update((unit) => {
			return r.branch(
				unit('details.lastTick').ne(tick), { details: {lastTick: tick} }, {}
			)
		}, {
			returnChanges: true
		}).run(this.conn).then((delta) => {
			if (!delta.changes || delta.changes.length === 0) {

				return [];
			}
			var units = [];
			for (let i = 0; i < delta.changes.length; i++) {
				var newunit = delta.changes[i].new_val;
				var oldunit = delta.changes[i].old_val;

				var properunit = new Unit();
				properunit.clone(newunit);
				units.push(properunit);

			}
			return units;
		});
	}

	async getUnprocessedUnitKeys(tick: number): Promise <Array<UUID>> {
		return this.table.getAll(true, {
				index: 'awake'
			}).filter(r.row('details.lastTick').lt(tick))
			.limit(env.unitProcessChunks)
			.pluck('uuid')
			.coerceTo('array')
			.run(this.conn);
	}

	async claimUnitTick(ctx: Context, uuid: UUID, tick: number): Promise < ? Unit > {
		const call = await startDBCall(ctx,'claimUnitTick');
		const delta = await this.table.get(uuid).update((unit) => {
			return r.branch(
				unit('details.lastTick').ne(tick), { details:{lastTick: tick} }, {}
			)
		}, { returnChanges: true }).run(this.conn);
		await call.end();

		if (!delta.changes || delta.changes.length !== 1) {
			return null;
		}
		let properunit = new Unit();
		properunit.clone(delta.changes[0].new_val);
		return properunit;
	}

	async countUnprocessedUnits(tick: number): Promise < number > {
		//new units will have lastTick set to 0. we do not want this in the 'unprocessed' count
		//however we still want to process them next tick.
		return await this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('details.lastTick').lt(tick - 1).and(r.row('details.lastTick').gt(0))).count().run(this.conn);
	}

	countAllUnits(): Promise < number > {
		return this.table.count().run(this.conn);
	}

	countAwakeUnits(): Promise < number > {
		return this.table.getAll(true, {
			index: 'awake'
		}).count().run(this.conn);
	}

	registerListener(func: Function) {
		this.table.changes().run(this.conn).then((cursor) => {
			cursor.each(func);
		});
	};


	//these should never get used.
	getTable(): r.Table {
		return this.table;
	}
	getConn(): r.Connection {
		return this.conn;
	}
}
