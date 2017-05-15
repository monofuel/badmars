// monofuel

import { UnitStatsChange } from '../net';
import Entity from '../units/entity';
import State from '../state';

let units: any = {};

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

export function getUnitInfo(type: string) {
	return units[type];
}

export function handleUnitStatChanges(state: State) {
	function updateUnitsListener(data: any) {
		console.log('new units data', data.units);
		units = data.units;

		if (state.map) {
			for (var unit of state.map.units) {
				updateUnit(unit);
			}
		}
	};


	UnitStatsChange.attach(updateUnitsListener)
}