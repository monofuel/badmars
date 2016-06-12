/* @flow */
'use strict';

// monofuel
// 2-7-2016


import {
  registerListener
} from '../net.js';
import {
  map
} from '../client.js';


var units = {};

function updateUnitsListener(data) {
	console.log('new units data',data.units);
  units = data.units;

  for (var unit of map.units) {
    updateUnit(unit);
  }
}

export function updateUnit(unit) {
  var unitInfo = getUnitInfo(unit.type);
  if (unitInfo) {
    for (var key of Object.keys(unitInfo)) {
      unit[key] = unitInfo[key];
    }
    if (unit.maxHealth && !unit.health) {
      unit.health = unit.maxHealth;
    }
  } else {
		console.log('MISSING UNIT DATA FOR ' + unit.type);
	}
}

registerListener('unitStats',updateUnitsListener);

export function getUnitInfo(type) {
  return units[type];
}
