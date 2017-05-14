/* @flow */
'use strict';

// monofuel
// 2-7-2016


import { registerListener } from '../net.js';
import { map } from '../client.js';
import { Entity } from "../units/entity.js";

let units = {};

function updateUnitsListener(data) {
	console.log('new units data', data.units);
	units = data.units;
	if (map) {
		for (var unit of map.units) {
			updateUnit(unit);
		}
	}
};

export function updateUnit(unit: any) {
	var unitInfo = getUnitInfo(unit.details.type);
	if (unitInfo) {
		for (var key of Object.keys(unitInfo)) {
			unit[key] = Object.assign(unit[key] || {}, unitInfo[key]);
		}

	} else {
		console.error(unit);
		throw new Error('MISSING UNIT DATA FOR ' + unit.type);
	}
}

registerListener('unitStats', updateUnitsListener);

export function getUnitInfo(type: string) {
	return units[type];
}
