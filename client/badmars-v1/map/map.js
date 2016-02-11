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
import {
	display
} from '../client.js';
import {
	Display
} from '../display.js';

export class Map {
	settings: Settings;
	grid: Array < Array < number >> ;
	navGrid: Array < Array < Symbol >> ;
	landMeshes: Array < THREE.Object3D > ;
	waterMeshes: Array < THREE.Object3D > ;
	units: Array < Entity > ;

	constructor() {
		this.units = [];
		this.landMeshes = [];
		this.waterMeshes = [];
	}

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

	update(delta: Number) {
		for (var unit of this.units) {
			unit.update(delta);
		}
	}

	getTileAtRay(mouse: THREE.Vector2): ? PlanetLoc {
		if (!display) {
			return null;
		}
		var raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, display.camera);

		var AllPlanetMeshes = this.landMeshes.concat(this.waterMeshes);
		var intersects = raycaster.intersectObjects(AllPlanetMeshes);
		if (intersects.length > 0) {
			var vec = intersects[0].point;
			var x = Math.floor(vec.x);
			var y = -(Math.floor(vec.z) + 1);
			return new PlanetLoc(this, x, y);
		}
		return null;

	}

}

class Settings {
	size: number;
	name: string;
}
