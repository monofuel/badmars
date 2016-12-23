/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import fs from 'fs';
var db = require('../../db/db.js');
import env from '../../config/env';
var logger = require('../../util/logger.js');

var unitStats = JSON.parse(fs.readFileSync('config/units.json'));

async function getUnitStats(client, data) {
	client.send('unitStats', { units: unitStats });
	if(!client.unitStatWatcher) {
		client.unitStatWatcher = fs.watch('config/units.json', {}, () => {
			console.log('units.json updated, reloading');
			fs.readFile('config/units.json', (err, data) => {
				if(err) {
					return console.log(err);
				}
				console.log('pushing unit updates to player');
				unitStats = JSON.parse(data);
				client.send('unitStats', { units: unitStats });
			});
		});
	}
};

module.exports = getUnitStats;
