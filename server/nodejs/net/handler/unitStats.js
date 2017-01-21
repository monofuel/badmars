/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import fs from 'fs';
import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import Context from 'node-context';
import Client from '../client';

const UNIT_STAT_FILE = 'config/units.json';

var unitStats = JSON.parse(fs.readFileSync(UNIT_STAT_FILE).toString());

async function getUnitStats(ctx: Context, client: Client, data: Object) {
	client.send('unitStats', { units: unitStats });
	if(!client.unitStatWatcher) {
		client.unitStatWatcher = fs.watchFile(UNIT_STAT_FILE, async() => {
			console.log('units.json updated, reloading');
			const statsFile = fs.readFileSync(UNIT_STAT_FILE).toString();

			console.log('pushing unit updates to player');
			unitStats = JSON.parse(statsFile);
			client.send('unitStats', { units: unitStats });
		});
	}
};

module.exports = getUnitStats;
