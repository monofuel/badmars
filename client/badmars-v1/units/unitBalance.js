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


var units = [];

function updateUnitsListener(data) {
  units = data.units;

  for (var unit of map.units) {
    var unitInfo = getUnitInfo(unit.type);
    if (unitInfo) {
      for (var key of Object.keys(unitInfo)) {
        unit[key] = unitInfo[key];
      }
    }
  }
}
registerListener('unitBalance',updateUnitsListener);

export function getUnitInfo(type) {
  for (var index in units) {
    var unit = units[index];
    if (unit.name == type) {
      return unit;
    }
  }
  return null;
}
