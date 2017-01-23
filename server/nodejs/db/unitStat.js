/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import r from 'rethinkdb';
import fs from 'fs';
import jsonlint from 'jsonlint';

import {safeCreateTable, startDBCall} from './db';
import logger from '../util/logger';

import UnitStat from '../unit/unitStat';

const UNIT_STAT_FILE = 'config/units.json';

const unitsFromDatabase = [];
const unitMap = {};

//load all default stats from file
async function loadDefaults(): Promise<void> {
	const statsFile = fs.readFileSync(UNIT_STAT_FILE).toString();
	try {
		// using jsonlint to give readable errors
		const stats = jsonlint.parse(statsFile);
		_.map(stats, (unit: Object, type: string) => {
			const unitStat = new UnitStat(type, unit);
			try {
				unitStat.validateSync();
			} catch(err) {
				logger.errorWithInfo('unit failed to validate', { err, type });
			}
			if(!unitsFromDatabase.includes(type)) {
				unitMap[type] = unitStat;
			}
		});
	} catch(err) {
		logger.error(err, 'failed to load unit definitions');
	}
	logger.info('Unit definitions loaded');
}



export default class DBUnitStat {
	conn: r.Connection;
	mapName: string;
	tableName: string;
	table: r.Table;

	constructor(connection: r.Connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = this.mapName + '_unitStats';
	}

	async init(): Promise<void> {
		this.table = await safeCreateTable(this.tableName);
		await loadDefaults();

		fs.watchFile(UNIT_STAT_FILE, async(): Promise<void> => {
			await loadDefaults();
		});

		// TODO get all unit stats from database and put them into unitMap
		// and add their types to unitsFromDatabase
	}

	createTable(): Promise<void> {
		const self = this;
		return r.tableCreate(self.tableName, {
			primaryKey: 'type'
		}).run(self.conn);
			// no indexes for this tables
	}

	async getAll(ctx: Context): Promise<Array<UnitStat>> {
		const call = await startDBCall(ctx, 'listUnitStats');
		const array: Array<UnitStat> = await this.table.coerceTo('array').run(this.conn);
		await call.end();
		return array;
	}

	get(type: string): UnitStat {
		//TODO update unitmap on db changes
		return unitMap[type];
	}

	async put(stat: UnitStat): Promise<void> {
		const profile = logger.startProfile('saveUnitStat');
		await this.table.get(stat.details.type).update(stat).run(this.conn);
		logger.endProfile(profile);
		return;
	}

}
