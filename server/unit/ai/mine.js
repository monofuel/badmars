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
exports.simulate = (unit,map) => {

	if (unit.resourceCooldown > 0) {
		unit.resourceCooldown--;
	}
	if (unit.resourceCooldown === 0) {
		//TODO
		//get the iron or oil at the location
		//map.produceIron
		//map.produceOil
	}

	return true;

	/* //old code
	if (unit.type == 'mine')
      if (unit.resourceCooldown == undefined)
        unit.resourceCooldown = 0
      if (unit.resourceCooldown > 0)
        unit.resourceCooldown--

      if (unit.resourceCooldown == 0)
        unit.location = [unit.tile.x, unit.tile.y]
        db.getUnitsAtLoc(unit.location).then((units) ->
          mine = unit
          #if (units.length < 2)
            #do error thing
          for tileUnit in units
            if (tileUnit.type == 'iron')
              mine.resourceCooldown = 10 * 5
              #console.log('producing iron')
              planet.produceIron(mine,20)
              mine.update = true
            if (tileUnit.type == 'oil')
              mine.resourceCooldown = 10 * 5
              #console.log('producing oil')
              planet.produceOil(mine,20)
              mine.update = true
          )
          .catch((error) ->
            console.log(error)
            )
	*/
}
