/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import _ from 'lodash';
import r from 'rethinkdb';
import fs from 'fs';
import parseJson from 'parse-json';

import UnitStat from '../unit/unitStat';
import { safeCreateTable } from './helper';
import { DetailedError, WrappedError } from '../util/logger';

import type Logger from '../util/logger';
import type MonoContext from '../util/monoContext';

const UNIT_STAT_FILE = 'config/units.json';

const unitsFromDatabase = [];
const unitMap = {};

//load all default stats from file
async function loadDefaults(): Promise<void> {
	const statsFile = fs.readFileSync(UNIT_STAT_FILE).toString();
	try {
		// using jsonlint to give readable errors
		const stats = parseJson(statsFile);
		_.map(stats, (unit: Object, type: string) => {
			const unitStat = new UnitStat(type, unit);
			try {
				unitStat.validateSync();
			} catch(err) {
				throw new DetailedError('unit failed to validate', { err, type });
			}
			if(!unitsFromDatabase.includes(type)) {
				unitMap[type] = unitStat;
			}
		});
	} catch(err) {
		throw new WrappedError(err, 'failed to load unit definitions');
	}
	// eslint-disable-next-line no-console
	console.log('Unit definitions loaded');
}



export default class DBUnitStat {
	conn: r.Connection;
	mapName: string;
	tableName: string;
	table: r.Table;
	logger: Logger;

	constructor(connection: r.Connection, logger: Logger, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = this.mapName + '_unitStats';
	}

	async init(): Promise<void> {
		this.table = await safeCreateTable(this.conn, this.logger, this.tableName);
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

	// TODO type this properly
	async getAll(): Promise<Object> {
		//TODO zip units from server with units from file
		//TODO live-update units from database
		return unitMap;
	}

	get(type: string): UnitStat {
		//TODO update unitmap on db changes
		return unitMap[type];
	}

	async put(ctx: MonoContext, stat: UnitStat): Promise<void> {
		const profile = ctx.logger.startProfile('saveUnitStat');
		await this.table.get(stat.details.type).update(stat).run(this.conn);
		ctx.logger.endProfile(profile);
		return;
	}

}