/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import { DetailedError } from '../util/logger';
import r from 'rethinkdb';
import env from '../config/env';
import Unit from '../unit/unit';
import { safeCreateTable, safeCreateIndex, startDBCall, clearSpareIndices } from './helper';

import type Logger from '../util/logger';
import type MonoContext from '../util/monoContext';

const VALID_INDICES = ['location.chunkHash', 'location.hash', 'details.lastTick', 'awake'];

export default class DBunit {
	conn: r.Connection;
	mapName: string;
	table: r.Table;
	tableName: string;

	constructor(connection: r.Connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = mapName + '_unit';
	}

	async init(logger: Logger): Promise<void> {
		this.table = await safeCreateTable(this.conn, logger, this.tableName, 'uuid');
		await safeCreateIndex(this.conn, logger, this.table, 'location.hash', true);
		await safeCreateIndex(this.conn, logger, this.table, 'location.chunkHash', true);
		await safeCreateIndex(this.conn, logger, this.table, 'details.lastTick');
		await safeCreateIndex(this.conn, logger, this.table, 'awake');
		await clearSpareIndices(this.conn, this.table, VALID_INDICES);
	}	

	async each(ctx: MonoContext, func: Function): Promise<void> {
		const cursor = await this.table.run(this.conn);
		await cursor.each((err: Error, doc: Object) => {
			if (err) {
				throw err;
			}
			const unit: Unit = new Unit(ctx);
			unit.clone(ctx, doc);
			func(unit);
		}).catch((err: Error) => {
			//dumb rethinkdb bug
			if (err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});
	}

	async listPlayersUnits(ctx: MonoContext, owner: string): Promise<Array<Unit>> {
		const call = await startDBCall(ctx,'listPlayersUnits');
		const cursor = await this.table.filter({details:{owner}}).run(this.conn);
		const units = await this.loadUnitsCursor(ctx, cursor);
		await call.end();
		return units;
	}

	async addUnit(ctx: MonoContext, unit: Unit): Promise<Unit> {
		const call = await startDBCall(ctx,'addUnit');
		const delta = await this.table.insert(unit, {
			returnChanges: true
		}).run(this.conn);
		await call.end();
		const loadedUnit = await this.loadUnit(ctx, delta.changes[0].new_val);
		unit.uuid = loadedUnit.uuid;
		return loadedUnit; // prefered to use over the unit passed in
	}

	async getUnit(ctx: MonoContext, uuid: UUID): Promise<Unit> {
		const call = await startDBCall(ctx,'getUnit');
		const doc = await this.table.get(uuid).run(this.conn);
		if (!doc) {
			throw new DetailedError('unit not found: ', { uuid });
		}
		await call.end();
		return this.loadUnit(ctx, doc);
	}
	async getUnits(ctx: MonoContext, uuids: Array<UUID>): Promise<Array<Unit>> {
		const call = await startDBCall(ctx,'getUnits');
		const promises = [];
		for (const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const docs = await Promise.all(promises);
		await call.check();
		const units = await this.loadUnits(ctx, docs);
		await call.end();
		return units;
	}

	async getUnitsMap(ctx: MonoContext, uuids: Array<UUID> ): Promise<UnitMap> {
		const call = await startDBCall(ctx,'getUnitsMap');
		const promises = [];
		for (const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const unitDocs = await Promise.all(promises);
		await call.check();
		const unitMap = {};
		for (const doc of unitDocs) {
			const unit: Unit = new Unit(ctx);
			unit.clone(ctx, doc);
			unitMap[unit.uuid] = unit;
		}
		await call.end();
		return unitMap;
	}

	async updateUnit(ctx: MonoContext, uuid: UUID, patch: Object): Promise<Object> {
		const call = await startDBCall(ctx,'updateUnit');
		const result = await this.table.get(uuid).update(patch).run(this.conn);
		await call.end();
		return result;
	}

	async saveUnit(ctx: MonoContext, unit: Unit): Promise<Object> {
		const call = await startDBCall(ctx,'saveUnit');
		const result = await this.table.get(unit.uuid).update(unit).run(this.conn);
		await call.end();
		return result;

	}

	async deleteUnit(ctx: MonoContext, uuid: UUID): Promise<void> {
		const call = await startDBCall(ctx,'deleteUnit');
		if (!uuid) {
			throw new Error('invalid uuid');
		}
		await this.table.get(uuid).delete().run(this.conn);
		await call.end();
	}

	async getUnitsAtChunk(ctx: MonoContext, x: number, y: number): Promise<Array<Unit>> {
		const call = await startDBCall(ctx,'getUnitsAtChunk');
		const hash = x + ':' + y;
		const unitDocs = await this.table.getAll(hash, {
			index: 'chunkHash'
		}).coerceTo('array').run(this.conn);
		await call.check();
		const units: Array<Unit> = [];
		for (const doc: Object of unitDocs) {
			units.push(await this.loadUnit(ctx, doc));
		}
		await call.end();
		return units;

	}

	async loadUnits(ctx: MonoContext, unitsList: Array<Object> ): Promise<Array<Unit>> {
		const units = [];
		_.each(unitsList, (doc: Object) => {
			units.push(this.loadUnit(ctx, doc));
		});

		return Promise.all(units);
	}

	async loadUnitsCursor(ctx: MonoContext, cursor: r.Cursor): Promise<Array<Unit>> {
		const units = [];
		await cursor.each((err: Error, doc: Object) => {
			if (err) {
				throw err;
			}
			units.push(this.loadUnit(ctx, doc));
		}).catch((err: Error) => {
			//dumb rethinkDB bug
			if (err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});

		return Promise.all(units);
	}

	async loadUnit(ctx: MonoContext, doc: Object): Promise<Unit> {
		if (!doc) {
			throw new Error('loadUnit called for null document');
		}
		const profile = ctx.logger.startProfile('loadUnit');
		const unit: Unit = new Unit(ctx);
		unit.clone(ctx, doc);
		ctx.logger.endProfile(profile);
		return unit;
	}

	async addFactoryOrder(ctx: MonoContext, uuid: UUID, order: FactoryOrder): Promise<void> {
		const call = await startDBCall(ctx,'addFactoryOrder');
		const result = await this.table.get(uuid).update((doc: any): any => {
			return {
				construct: {
					factoryQueue: doc('construct')('factoryQueue').append(order),
				},
				awake: true
			};
		}, { returnChanges: true }).run(this.conn);

		await call.end();
		if (result.replaced !== 1) {
			throw new DetailedError('did not add factory order', { dbError: result.first_error });
		}

	}

	registerPathListener(func: Function) {
		this.table.filter(r.row.hasFields({movable: {destination: true }}))
			.filter(r.row('movable')('isPathing').eq(false))
			.filter(r.row('movable')('path').eq([]))
			.changes().run(this.conn).then((cursor: any) => {
				cursor.each(func);
			});
	}

	async getUnprocessedPath(): Promise<Object> {

		const result = await this.table.filter(r.row.hasFields({movable: {destination: true }}))
			.filter(r.row('movable')('isPathing').eq(false))
			.filter(r.row('movable')('path').eq([]))
			.limit(env.pathChunks)
			.update((unit: any): any => {
				return r.branch(
					unit('movable')('isPathing').eq(false), { movable: { isPathing: true, pathUpdate: Date.now() } }, {}
				);
			}, {
				durability: 'hard',
				returnChanges: true
			}).run(this.conn);
		return result;
	}

	getUnprocessedUnits(ctx: MonoContext, tick: number): Promise<Array<Unit>> {
		return this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('details')('lastTick').lt(tick)).limit(env.unitProcessChunks).update((unit: any): any => {
			return r.branch(
				unit('details')('lastTick').ne(tick), { details: {lastTick: tick} }, {}
			);
		}, {
			returnChanges: true
		}).run(this.conn).then((delta: Object): Array<Unit> => {
			if (!delta.changes || delta.changes.length === 0) {

				return [];
			}
			const units = [];
			for (let i = 0; i < delta.changes.length; i++) {
				const newunit = delta.changes[i].new_val;
				//const oldunit = delta.changes[i].old_val;

				const properunit: Unit = new Unit(ctx);
				properunit.clone(ctx, newunit);
				units.push(properunit);

			}
			return units;
		});
	}

	async getUnprocessedUnitKeys(tick: number): Promise<Array<UUID>> {
		return this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('details')('lastTick').lt(tick))
			.limit(env.unitProcessChunks)
			.pluck('uuid')
			.coerceTo('array')
			.run(this.conn);
	}

	async claimUnitTick(ctx: MonoContext, uuid: UUID, tick: number): Promise<? Unit> {
		const call = await startDBCall(ctx,'claimUnitTick');
		const delta = await this.table.get(uuid).update((unit: any): any => {
			return r.branch(
				unit('details')('lastTick').ne(tick), { details:{lastTick: tick} }, {}
			);
		}, { returnChanges: true }).run(this.conn);
		await call.end();

		if (!delta.changes || delta.changes.length !== 1) {
			return null;
		}
		const properunit: Unit = new Unit(ctx);
		properunit.clone(ctx, delta.changes[0].new_val);
		return properunit;
	}

	async countUnprocessedUnits(tick: number): Promise<number> {
		//new units will have lastTick set to 0. we do not want this in the 'unprocessed' count
		//however we still want to process them next tick.
		return await this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('details')('lastTick').lt(tick - 1).and(r.row('details')('lastTick').gt(0))).count().run(this.conn);
	}

	countAllUnits(): Promise<number> {
		return this.table.count().run(this.conn);
	}

	countAwakeUnits(): Promise<number> {
		return this.table.getAll(true, {
			index: 'awake'
		}).count().run(this.conn);
	}

	async registerListener(func: Function): Promise<void> {
		const cursor = await this.table.changes().run(this.conn);
		cursor.each(func);
	}


	//these should never get used.
	getTable(): r.Table {
		return this.table;
	}
	getConn(): r.Connection {
		return this.conn;
	}
}