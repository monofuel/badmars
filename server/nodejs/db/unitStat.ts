
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
import * as r from 'rethinkdb';
import * as fs from 'fs';
const parseJson = require('parse-json');

import UnitStat from '../unit/unitStat';
import { createTable } from './helper';
import { DetailedError, WrappedError } from '../logger';

import logger from '../logger';
import Context from '../context';

const UNIT_STAT_FILE = 'config/units.json';

const unitsFromDatabase: any = [];
const unitMap: any = {};

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
			} catch (err) {
				throw new WrappedError(err, 'unit failed to validate', { type });
			}
			if (!unitsFromDatabase.includes(type)) {
				unitMap[type] = unitStat;
			}
		});
	} catch (err) {
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

	constructor(connection: r.Connection, mapName: string) {
		this.conn = connection;
		this.mapName = mapName;
		this.tableName = this.mapName + '_unitStats';
	}

	async setup(): Promise<void> {
		this.table = await createTable(this.conn, this.tableName);
	}

	async init(): Promise<void> {
		this.table = r.table(this.tableName);
		await loadDefaults();

		fs.watchFile(UNIT_STAT_FILE, async (): Promise<void> => {
			await loadDefaults();
		});

		// TODO get all unit stats from database and put them into unitMap
		// and add their types to unitsFromDatabase
	}

	createTable(): Promise<void> {
		const self = this;
		return (r as any).tableCreate(self.tableName, {
			primaryKey: 'type'
		}).run(self.conn);
		// no indexes for this tables
	}

	// TODO type this properly
	async getAll(ctx: Context): Promise<Object> {
		//TODO zip units from server with units from file
		//TODO live-update units from database
		return unitMap;
	}

	get(type: string): UnitStat {
		//TODO update unitmap on db changes
		return unitMap[type];
	}

	async put(ctx: Context, stat: UnitStat): Promise<void> {
		const profile = logger.startProfile('saveUnitStat');
		await this.table.get(stat.details.type).update(stat).run(this.conn);
		logger.endProfile(profile);
		return;
	}

}