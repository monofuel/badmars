/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import { Context } from 'node-context';
import r from 'rethinkdb';
import Unit from '../unit/unit';
import db from "./db";
import env from '../config/env';
import logger from '../util/logger';

const VALID_INDICES = ['location.chunkHash', 'location.hash', 'details.lastTick', 'awake'];

class DBunit {
	conn: r.Connection;
	mapName: string;
	table: r.Table;

	constructor(connection, mapName) {
		this.conn = connection;
		this.mapName = mapName;
	}

	async init() {
		var tableName = this.mapName + "_unit";
		var self = this;
		//r.tableDrop(tableName).run(self.conn);

		const tableList: Array < string > = await r.tableList().run(self.conn)
		if(!tableList.includes(tableName)) {
			console.log('creating unit table for ' + self.mapName);
			await r.tableCreate(tableName, {
				primaryKey: 'uuid'
			}).run(self.conn);
		}
		this.table = r.table(tableName);

		let indexList = await this.table.indexList().run(self.conn);
		if(!indexList.includes('location.hash')) {
			console.log("adding location hash index");
			await this.table.indexCreate("location.hash", {
				multi: true
			}).run(self.conn);
		}
		if(!indexList.includes('location.chunkHash')) {
			console.log("adding location chunk hash index");
			await r.table(tableName).indexCreate("location.chunkHash", {
				multi: true
			}).run(self.conn);
		}

		if(!indexList.includes('details.lastTick')) {
			console.log("adding lastTick index");
			await r.table(tableName).indexCreate("details.lastTick").run(self.conn);
		}

		if(!indexList.includes('awake')) {
			console.log("adding awake index");
			await r.table(tableName).indexCreate("awake").run(self.conn);
		}
		let spareIndices = [];
		do {
			await this.table.indexWait();
			indexList = await this.table.indexList().run(self.conn);
			spareIndices = _.remove(indexList, (e) => { return !VALID_INDICES.includes(e) })
			for(let index of spareIndices) {
				await this.table.indexDrop(index).run(self.conn);
			}
		} while (spareIndices > 0);
	}

	listUnits() {
		let profile = logger.startProfile('listUnits');
		return this.table.coerceTo('array').run(this.conn).then((array) => {
			logger.endProfile(profile);
			return array;
		});
	}

	async listPlayersUnits(ctx: Context, owner: string): Promise < Array < Unit >> {
		const profile = logger.startProfile('listPlayersUnits');
		const cursor = await this.table.filter(r.row('owner').eq(owner)).run(this.conn);
		logger.checkContext(ctx, 'list players units');
		const units = await this.loadUnitsCursor(cursor);
		logger.endProfile(profile);
		return units;
	}

	async addUnit(unit) {
		let profile = logger.startProfile('addUnit');
		let delta = await this.table.insert(unit, {
			returnChanges: true
		}).run(this.conn);
		logger.endProfile(profile);
		return await this.loadUnit(delta.changes[0].new_val);
	}

	async getUnit(uuid) {
		let profile = logger.startProfile('getUnit');
		let doc = await this.table.get(uuid).run(this.conn);
		if(!doc) {
			console.log('unit not found: ', uuid);
		}
		logger.endProfile(profile);
		return this.loadUnit(doc);
	}
	async getUnits(uuids) {
		let profile = logger.startProfile('getUnits');
		const promises = [];
		for(const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const docs = await Promise.all(promises);
		const units = await this.loadUnits(docs);
		logger.endProfile(profile);
		return units;
	}

	async getUnitsMap(uuids: Array < UUID > ): Promise < UnitMap > {
		const profile = logger.startProfile('getUnits');
		const promises = [];
		for(const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const unitDocs = await Promise.all(promises);
		const unitMap = {};
		for(let doc of unitDocs) {
			const unit = new Unit();
			unit.clone(doc);
			unitMap[unit.uuid] = unit;
		}
		logger.endProfile(profile);
		return unitMap;
	}

	async updateUnit(uuid, patch) {
		let profile = logger.startProfile('updateUnit');
		let result = await this.table.get(uuid).update(patch).run(this.conn);
		logger.endProfile(profile);
		return result;
	}

	async saveUnit(unit) {
		let profile = logger.startProfile('saveUnit');
		let result = await this.table.get(unit.uuid).update(unit).run(this.conn);
		logger.endProfile(profile);
		return result;

	};

	async deleteUnit(uuid) {
		return await this.table.get(uuid).delete().run(this.conn);
	}

	getUnitAtTile(hash) {

		//TODO find all uses of this function and remove it
		console.log('depreciated');
		console.log((new Error()).stack);

		var self = this;
		return this.table.getAll(hash, {
			index: "tileHash"
		}).coerceTo('array').run(this.conn).then((docs) => {
			var doc = docs[0];
			if(docs.length > 1) {
				console.log('error: multiple units at tile');
			}
			if(!doc) {
				return null;
			}
			return self.loadUnit(doc);

		});
	}

	async getUnitsAtTile(hash): Promise < Array < Unit >> {
		let profile = logger.startProfile('getunitsAtTile');
		let docs = await this.table.getAll(hash, {
			index: "tileHash"
		}).coerceTo('array').run(this.conn);

		let units = [];
		for(let doc of docs) {
			units.push(await this.loadUnit(doc));
		}
		logger.endProfile(profile);
		return units;
	}

	async getUnitsAtChunk(x, y) {
		let profile = logger.startProfile('getunitsAtChunk');
		var hash = x + ":" + y;
		var unitDocs = await this.table.getAll(hash, {
			index: "chunkHash"
		}).coerceTo('array').run(this.conn);

		var units = [];
		for(let doc of unitDocs) {
			units.push(await this.loadUnit(doc));
		}
		logger.endProfile(profile);
		return units;

	}

	async loadUnits(unitsList: Array < Object > ): Promise < Array < Unit >> {
		const units = [];
		_.each(unitsList, (doc) => {
			units.push(this.loadUnit(doc));
		});

		return Promise.all(units);
	}

	async loadUnitsCursor(cursor): Promise < Array < Unit >> {
		const units = [];
		await cursor.each((err, doc) => {
			if(err) {
				throw err;
			}
			units.push(this.loadUnit(doc));
		}).catch((err) => {
			//dumb rethinkDB bug
			if(err.message === 'No more rows in the cursor.') {
				return;
			}
			throw err;
		});

		return Promise.all(units);
	}

	async loadUnit(doc) {
		if(!doc) {
			return null;
		}
		let profile = logger.startProfile('loadUnit');
		let unit = new Unit();
		unit.clone(doc);
		logger.endProfile(profile);
		return unit;
	}

	addFactoryOrder(uuid, order) {
		return this.table.get(uuid).update({
			factoryQueue: r.row('factoryQueue').append(order),
			awake: true
		}).run(this.conn);
	}

	//would be nice if i could combine
	//pathlistener and getunprocessed into one step
	//atm pathlistener will trigger a check to fetch unprocessed
	//and unprocessed atomicly picks off a unit
	registerPathListener(func) {
		return this.table.filter(r.row.hasFields('destination'))
			.filter(r.row('isPathing').eq(false))
			.filter(r.row('path').eq([]))
			.changes().run(this.conn).then((cursor) => {
				cursor.each(func);
			})
	}

	async getUnprocessedPath() {

		let result = await this.table.filter(r.row.hasFields('destination'))
			.filter(r.row('isPathing').eq(false))
			.filter(r.row('path').eq([]))
			.limit(env.pathChunks)
			.update((unit) => {
				return r.branch(
					unit('isPathing').eq(false), { isPathing: true, pathUpdate: Date.now() }, {}
				)
			}, {
				durability: 'hard',
				returnChanges: true
			}).run(this.conn);
		return result;
	}

	getUnprocessedUnits(tick) {
		return this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('lastTick').lt(tick)).limit(env.unitProcessChunks).update((unit) => {
			return r.branch(
				unit('lastTick').ne(tick), { lastTick: tick }, {}
			)
		}, {
			returnChanges: true
		}).run(this.conn).then((delta) => {
			if(!delta.changes || delta.changes.length === 0) {

				return [];
			}
			var units = [];
			for(let i = 0; i < delta.changes.length; i++) {
				var newunit = delta.changes[i].new_val;
				var oldunit = delta.changes[i].old_val;

				var properunit = new Unit();
				properunit.clone(newunit);
				units.push(properunit);

			}
			return units;
		});
	}

	async getUnprocessedUnitKeys(tick) {
		return this.table.getAll(true, {
				index: 'awake'
			}).filter(r.row('lastTick').lt(tick))
			.limit(env.unitProcessChunks)
			.pluck('uuid')
			.coerceTo('array')
			.run(this.conn);
	}

	async claimUnitTick(ctx: Context, uuid: UUID, tick: number) {
		const profile = logger.startProfile('claimUnitTick');
		const delta = await this.table.get(uuid).update((unit) => {
			return r.branch(
				unit('lastTick').ne(tick), { lastTick: tick }, {}
			)
		}, { returnChanges: true }).run(this.conn);
		logger.endProfile(profile);
		logger.checkContext(ctx, 'claim unit tick');

		if(!delta.changes || delta.changes.length !== 1) {
			return null;
		}
		let properunit = new Unit();
		properunit.clone(delta.changes[0].new_val);
		return properunit;
	}

	async countUnprocessedUnits(tick) {
		//new units will have lastTick set to 0. we do not want this in the 'unprocessed' count
		//however we still want to process them next tick.
		return await this.table.getAll(true, {
			index: 'awake'
		}).filter(r.row('lastTick').lt(tick - 1).and(r.row('lastTick').gt(0))).count().run(this.conn);
	}

	countAllUnits() {
		return this.table.count().run(this.conn);
	}

	countAwakeUnits() {
		return this.table.getAll(true, {
			index: 'awake'
		}).count().run(this.conn);
	}

	registerListener(func) {
		this.table.changes().run(this.conn).then((cursor) => {
			cursor.each(func);
		});
	};


	//these should never get used.
	getTable() {
		return this.table;
	}
	getConn() {
		return this.conn;
	}
}


module.exports = DBunit;
