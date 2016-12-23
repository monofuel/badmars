/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import R from 'rethinkdb';
import Unit from '../unit/unit.js';
import DB from "./db";
var Env = require('../config/env.js');
var Logger = require('../util/logger.js');

import Context from 'node-context';

class DBUnit {
	conn: R.Connection;
	mapName: string;
	table: R.Table;

	constructor(connection, mapName) {
		this.conn = connection;
		this.mapName = mapName;
	}

	init() {
		var tableName = this.mapName + "_unit";
		var self = this;
		//R.tableDrop(tableName).run(self.conn);

		return R.tableList().run(self.conn)
			.then((tableList) => {
				if(tableList.indexOf(tableName) == -1) {
					console.log('creating unit table for ' + self.mapName);
					return R.tableCreate(tableName, {
						primaryKey: 'uuid'
					}).run(self.conn).then(() => {
						console.log("adding tile hash index");
						return R.table(tableName).indexCreate("tileHash", {
							multi: true
						}).run(self.conn);
					}).then(() => {
						console.log("adding chunk hash index");
						return R.table(tableName).indexCreate("chunkHash", {
							multi: true
						}).run(self.conn);
					}).then(() => {
						console.log("adding lastTick index");
						return R.table(tableName).indexCreate("lastTick").run(self.conn);
					}).then(() => {
						console.log("adding awake index");
						return R.table(tableName).indexCreate("awake").run(self.conn);
					});
				}
			}).then(() => {
				self.table = R.table(tableName);
			});
	}

	listUnits() {
		let profile = Logger.startProfile('listUnits');
		return this.table.coerceTo('array').run(this.conn).then((array) => {
			Logger.endProfile(profile);
			return array;
		});
	}

	async listPlayersUnits(owner) {
		const profile = Logger.startProfile('listPlayersUnits');
		const cursor = await this.table.filter(R.row('owner').eq(owner)).run(this.conn);
		const units = await this.loadUnitsCursor(cursor);
		Logger.endProfile(profile);
		return units;
	}

	async addUnit(unit) {
		let profile = Logger.startProfile('addUnit');
		let delta = await this.table.insert(unit, {
			returnChanges: true
		}).run(this.conn);
		Logger.endProfile(profile);
		return await this.loadUnit(delta.changes[0].new_val);
	}

	async getUnit(uuid) {
		let profile = Logger.startProfile('getUnit');
		let doc = await this.table.get(uuid).run(this.conn);
		if(!doc) {
			console.log('unit not found: ', uuid);
		}
		Logger.endProfile(profile);
		return this.loadUnit(doc);
	}
	async getUnits(uuids) {
		let profile = Logger.startProfile('getUnits');
		const promises = [];
		for(const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const docs = await Promise.all(promises);
		const units = await this.loadUnits(docs);
		Logger.endProfile(profile);
		return units;
	}

	async getUnitsMap(uuids: Array < UUID > ): Promise < UnitMap > {
		const profile = Logger.startProfile('getUnits');
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
		Logger.endProfile(profile);
		return unitMap;
	}

	async updateUnit(uuid, patch) {
		let profile = Logger.startProfile('updateUnit');
		let result = await this.table.get(uuid).update(patch).run(this.conn);
		Logger.endProfile(profile);
		return result;
	}

	async saveUnit(unit) {
		let profile = Logger.startProfile('saveUnit');
		let result = await this.table.get(unit.uuid).update(unit).run(this.conn);
		Logger.endProfile(profile);
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

	async getUnitsAtTile(hash) {
		let profile = Logger.startProfile('getUnitsAtTile');
		let docs = await this.table.getAll(hash, {
			index: "tileHash"
		}).coerceTo('array').run(this.conn);

		let units = [];
		for(let doc of docs) {
			units.push(await this.loadUnit(doc));
		}
		Logger.endProfile(profile);
		return units;
	}

	async getUnitsAtChunk(x, y) {
		let profile = Logger.startProfile('getUnitsAtChunk');
		var hash = x + ":" + y;
		var unitDocs = await this.table.getAll(hash, {
			index: "chunkHash"
		}).coerceTo('array').run(this.conn);

		var units = [];
		for(let doc of unitDocs) {
			units.push(await this.loadUnit(doc));
		}
		Logger.endProfile(profile);
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
		let profile = Logger.startProfile('loadUnit');
		let map = await DB.map.getMap(doc.location.map);
		let unit = new Unit(doc.type, map, doc.location.x, doc.location.y);
		unit.clone(doc);
		Logger.endProfile(profile);
		return unit;
	}

	addFactoryOrder(uuid, order) {
		return this.table.get(uuid).update({
			factoryQueue: R.row('factoryQueue').append(order),
			awake: true
		}).run(this.conn);
	}

	//would be nice if i could combine
	//pathlistener and getunprocessed into one step
	//atm pathlistener will trigger a check to fetch unprocessed
	//and unprocessed atomicly picks off a unit
	registerPathListener(func) {
		return this.table.filter(R.row.hasFields('destination'))
			.filter(R.row('isPathing').eq(false))
			.filter(R.row('path').eq([]))
			.changes().run(this.conn).then((cursor) => {
				cursor.each(func);
			})
	}

	async getUnprocessedPath() {

		let result = await this.table.filter(R.row.hasFields('destination'))
			.filter(R.row('isPathing').eq(false))
			.filter(R.row('path').eq([]))
			.limit(Env.pathChunks)
			.update((unit) => {
				return R.branch(
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
		}).filter(R.row('lastTick').lt(tick)).limit(Env.unitProcessChunks).update((unit) => {
			return R.branch(
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
				var newUnit = delta.changes[i].new_val;
				var oldUnit = delta.changes[i].old_val;

				var properUnit = new Unit();
				properUnit.clone(newUnit);
				units.push(properUnit);

			}
			return units;
		});
	}

	async getUnprocessedUnitKeys(tick) {
		return this.table.getAll(true, {
				index: 'awake'
			}).filter(R.row('lastTick').lt(tick))
			.limit(Env.unitProcessChunks)
			.pluck('uuid')
			.coerceTo('array')
			.run(this.conn);
	}

	async claimUnitTick(ctx: Context, uuid: UUID, tick: number) {
		const profile = Logger.startProfile('claimUnitTick');
		const delta = await this.table.get(uuid).update((unit) => {
			return R.branch(
				unit('lastTick').ne(tick), { lastTick: tick }, {}
			)
		}, { returnChanges: true }).run(this.conn);
		profile.endProfile(profile);
		Logger.checkContext(ctx, 'claim unit tick');

		if(!delta.changes || delta.changes.length !== 1) {
			return null;
		}
		let properUnit = new Unit();
		properUnit.clone(delta.changes[0].new_val);
		return properUnit;
	}

	async countUnprocessedUnits(tick) {
		//new units will have lastTick set to 0. we do not want this in the 'unprocessed' count
		//however we still want to process them next tick.
		return await this.table.getAll(true, {
			index: 'awake'
		}).filter(R.row('lastTick').lt(tick - 1).and(R.row('lastTick').gt(0))).count().run(this.conn);
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


module.exports = DBUnit;
