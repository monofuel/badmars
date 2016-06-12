//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

var Unit = require('../../unit/unit.js');

async function createGhost(client,data) {
	if (!data.unitType) {
		return client.sendError('createGhost', 'no unit specified');
	}
	if (!data.location || data.location.length !== 2) {
		return client.sendError('createGhost', 'no or invalid location set');
	}

	let map = client.map;

	try {
		//TODO validate the unit type
		//maybe this logic should be moved into map
		let unit = new Unit(data.unitType,map,data.location[0],data.location[1]);
		unit.ghosting = true;

		let success = map.spawnUnit(unit);

		if (success) {
			console.log('new ghost unit');
			client.send('createGhost',{unit: unit});
		} else {
			client.sendError('createGhost', 'invalid order');
		}
	} catch (err) {
		logger.error(err);
		client.sendError('createGhost', 'server error');
	}
};

module.exports = createGhost;


/* // old code

Net.registerListener('createGhost', (data,client) ->
  unitInfo = get(data.unitType);
  if (!unitInfo)
    client.send(Net.errMsg('createGhost','missing unitType field'));
    return
  if (!data.location)
    client.send(Net.errMsg('createGhost','missing location field'));
    return

  tile = new PlanetLoc(client.planet,data.location[0],data.location[1])
  if(!client.planet.checkValidForUnit(tile,unitInfo.name))
    client.send(Net.errMsg('createGhost','invalid location'));
    return;

  db.createUnit(tile,unitInfo.name,client.userInfo._id,true)
    .then((ghost) ->
      ghost.tile = tile;
      ghost.totalAttempts = 0
      ghost.health = unitInfo.maxHealth
      tile.planet.units.push(ghost)
      console.log('creating ghost unit')
      client.send({type: 'createGhost',unit: ghost});
    )
  )
*/
