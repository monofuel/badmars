/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import helper from '../util/helper';
import r from 'rethinkdb';

import DBChunk from './chunk';
import DBUnit from './unit';
import DBUnitStat from './unitStat';

import map from './map';
import user from './user';
import chat from './chat';
import event from './event';
const chunks = {};
const units = {};
const unitStats = {};
let logger;
let conn: r.Connection;


async function init(): Promise<void> {
	logger = require('../util/logger');
	const options: {
		host: string,
		db: string,
		port?: number,
		user?: string,
		password?: string
	} = {
		host: env.dbHost,
		db: env.database,
	};
	if (env.dbPort) {
		options.port = env.dbPort;
	}
	if (env.dbUser) {
		options.user = env.dbUser;
	}
	if (env.dbPassword) {
		options.password = env.dbPassword;
	}
	try {
		conn = await r.connect(options);
	} catch (err) {
		logger.error(err, 'failed to connect to DB, retrying in 5 seconds');
		await helper.sleep(5000);
		return exports.init();
	}
	const dbList = await r.dbList().run(conn);

	if (dbList.indexOf('badmars') == -1) {
		logger.info('creating database');
		await r.dbCreate('badmars').run(conn);
	}

	r.db('badmars');
	//console.log('preparing tables');
	await Promise.all([
		map.init(conn),
		chat.init(conn),
		event.init(conn),
		user.init(conn),
	]);

	const mapNames = await map.listNames();

	//console.log('preparing chunks');
	const chunkPromises = [];
	for (const name of mapNames) {
		const chunk = new DBChunk(conn, name);
		chunkPromises.push(chunk.init());
		this.chunks[name] = chunk;
	}
	await Promise.all(chunkPromises);

	//console.log('preparing units');
	const unitPromises = [];
	for (const name of mapNames) {
		const unit = new DBUnit(conn, name);
		unitPromises.push(unit.init());
		this.units[name] = unit;
	}
	await Promise.all(unitPromises);

	const unitStatPromises = [];
	for (const name of mapNames) {
		const unitStat = new DBUnitStat(conn, name);
		unitStatPromises.push(unitStat.init());
		this.unitStats[name] = unitStat;
	}
	await Promise.all(unitStatPromises);

	await this.map.createRandomMap('testmap');
	//console.log('created map testmap');
	logger.info('INITIALIZED')
}

async function close(): Promise<void> {
	return this.conn.close();
}

const db = {
	init,
	close,
	map,
	units,
	user,
	chat,
	chunks,
	unitStats,
	event,
};
console.log('dbobject', db)
module.exports = db;