//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

//TODO
//not tested yet
async function pullResource(unit,map) {

	if (unit.resourceCooldown > 0) {
		unit.resourceCooldown--;
	}
	if (unit.resourceCooldown === 0) {

		let tile = await map.getLocFromHash(unit.tileHash[0])
		let unitsAtTile = await map.unitsTileCheck(tile);
		//get the iron or oil at the location
		let resource = null;
		for (let otherUnit of unitsAtTile) {
			if (otherUnit.type === 'iron' || otherUnit.type === 'oil') {
				resource = otherUnit;
			}
		}
		if (!resource) {
			//invalid mine
			console.log('invalid mine: ' + unit.tileHash);
			return
		}
		if (resource.type === 'iron') {
			map.produceIron(unit,10);
		} else if (resource.type === 'oil') {
			map.produceFuel(unit,10);
		}

	}

	return true;
}

exports.simulate = pullResource;
