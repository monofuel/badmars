/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	PlanetLoc
} from '../map/planetLoc.js';
import {
	Entity
} from "./entity.js";
import {
	N,
	S,
	E,
	W,
	C
} from './directions.js';
import {
	getMesh
} from './unitModels.js';

export class Iron extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uid: string) {
		var geometry = getMesh('iron');
		var material = new THREE.MeshLambertMaterial({
			color: 0xF8F8F8
		});
		if (geometry) {
			var ironMesh = new THREE.Mesh(geometry, material);
			ironMesh.scale.set(0.6, 0.6, 0.6);

			super(location, ironMesh);
		} else {
			console.log("failed to get iron mesh!");
			super(location, null);
		}
		this.rate = rate;
		this.type = 'iron';
		this.uid = uid;
	}
}
