//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {

};

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
