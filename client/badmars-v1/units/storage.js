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

export class Storage extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uid: string) {
		var geometry = new THREE.BoxGeometry(3,3,3);
		var material = new THREE.MeshLambertMaterial({
			color: 0xAAAAAA
		});
		if (geometry) {
			var storageMesh = new THREE.Mesh(geometry, material);
			storageMesh.scale.set(0.6, 0.6, 0.6);

			super(location, storageMesh);
		} else {
			console.log("failed to get storage mesh!");
			super(location, null);
		}
		this.rate = rate;
		this.type = 'storage';
		this.uid = uid;
	}
}
