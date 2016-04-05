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

export class Builder extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uid: string) {
		var geometry = new THREE.BoxGeometry(0.9,0.9,0.9);
		var material = new THREE.MeshLambertMaterial({
			color: 0xff0000
		});
		if (geometry) {
			var builderMesh = new THREE.Mesh(geometry, material);
			builderMesh.scale.set(0.6, 0.6, 0.6);

			super(location, builderMesh);
		} else {
			console.log("failed to get builder mesh!");
			super(location, null);
		}
		this.rate = rate;
		this.type = 'builder';
		this.uid = uid;
	}
}
