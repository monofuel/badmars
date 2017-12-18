import GameState, { UnitStatsChange, UnitStatsEvent } from '../state';
import * as _ from 'lodash';

let units: any = {};

export function updateUnit(unit: any) {
	const unitInfo = getUnitInfo(unit.details.type);

	if (unitInfo) {
		_.merge(unit, unitInfo);
	} else {
		console.error(unit);
		throw new Error('MISSING UNIT DATA FOR ' + unit.type);
	}
}

export function getUnitInfo(type: string) {
	return units[type];
}

export function handleBalanceChanges() {

	function updateUnitsListener(data: UnitStatsEvent) {
		console.log('new units data', data.stats);
		units = data.stats;

		if (gameState.map) {
			Object.values(gameState.units).forEach(updateUnit);
		}
	}

	UnitStatsChange.attach(updateUnitsListener);
}