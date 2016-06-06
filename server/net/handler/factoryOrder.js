//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

module.exports = (client,data) => {
	//TODO
};

/* // old code
Net.registerListener('factoryOrder', (data,client) ->
  # {type:'factoryOrder',factory:selectedUnit.uid, unitType:unitType}
  unitInfo = get(data.unitType);
  if (!unitInfo)
    client.send(Net.errMsg('factoryOrder','missing unitType field'));
    return
  if (!data.factory)
    client.send(Net.errMsg('factoryOrder','missing factory field'));
    return

  factory = client.planet.getUnitById(data.factory)
  if (!factory || factory.type != 'factory')
    client.send(Net.errMsg('factoryOrder','invalid factory'));
    return;

  if (!factory.factoryQueue)
    factory.factoryQueue = []
  console.log('pushing ' + unitInfo.name + ' to queue');
  factory.factoryQueue.push({
    remaining: unitInfo.buildTime
    type: unitInfo.name
    cost: unitInfo.cost
    });
  factory.save()

)
*/
