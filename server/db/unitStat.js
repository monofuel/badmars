/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import r from 'rethinkdb';
import fs from 'fs';
import jsonlint from 'jsonlint';

import db from './db';
import env from '../config/env';
import logger from '../util/logger';

import UnitStat from '../unit/unitStat';

const UNIT_STAT_FILE = 'config/units.json';

const unitsFromDatabase = [];
const unitMap = {};

//load all default stats from file
async function loadDefaults() {
	const statsFile = fs.readFileSync(UNIT_STAT_FILE).toString();
	let stats;
	try {
		// using jsonlint to give readable errors
		const stats = jsonlint.parse(statsFile);
		_.map(stats, (unit: Object, type: string) => {
			const unitStat = new UnitStat(type, unit);
			try {
				unitStat.validateSync()
			} catch(err) {
				console.error('unit ' + type + ' failed to validate', err);
			}
			if(!unitsFromDatabase.includes(type)) {
				unitMap[type] = unitStat;
			}
		});
	} catch(err) {

		console.log('====================');
		console.log('failed to load unit definitions');
		console.log('====================');
		throw err;
	}
	console.log('Unit definitions loaded');
}



export default class DBUnitStat {
	conn: r.Connection;
	mapName: string;
	tableName: string;
	table: r.Table;

	constructor(connection: r.Connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = this.mapName + "_unitStats";
	}

	async init(): Promise <void> {
		this.table = await db.safeCreateTable(this.tableName);
		await loadDefaults();

		fs.watchFile(UNIT_STAT_FILE, async() => {
			console.log('units.json updated, reloading');
			await loadDefaults();
		})

		// TODO get all unit stats from database and put them into unitMap
		// and add their types to unitsFromDatabase
	}

	createTable(): Promise < void > {
		const self = this;
		return r.tableCreate(self.tableName, {
				primaryKey: 'type'
			}).run(self.conn)
			// no indexes for this tables
	}

	async getAll() {
		let profile = logger.startProfile('listUnitStats');
		return this.table.coerceTo('array').run(this.conn).then((array: Array < string > ) => {
			logger.endProfile(profile);
			return array;
		})
	}

	get(type: string) {
		//TODO update unitmap on db changes
		return unitMap[type];
	}

	async put(stat: UnitStat) {
		let profile = logger.startProfile('saveUnitStat');
		let result = await this.table.get(stat.details.type).update(stat).run(this.conn);
		logger.endProfile(profile);
		return result;
	}

}
