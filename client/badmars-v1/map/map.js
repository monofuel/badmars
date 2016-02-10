/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	PlanetLoc
} from './planetLoc.js';
import {
	TILE_LAND,
	TILE_WATER,
	TILE_CLIFF,
	TILE_COAST
} from './tileTypes.js';
import {
	Entity
} from '../units/entity.js';

export class Map {
	settings: Settings;
	grid: Array < Array < number >> ;
	navGrid: Array < Array < Symbol >> ;
	landMeshes: Array < THREE.Object3D > ;
	waterMeshes: Array < THREE.Object3D > ;
	units: Array < Entity > ;

	/**
	 * @param	{PlanetLoc}	location to check
	 * @return	{Entity}	Unit at the location
	 */
	unitTileCheck(tile: PlanetLoc): Entity | null {
		//TODO this could be optimized
		for (var unit of this.units) {
			if (unit.checkGroundTile(tile)) {
				return unit;
			}
		}
		return null;
	}

}

class Settings {
	size: number;
	name: string;
}
