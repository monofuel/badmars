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

export class Oil extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uuid: string) {
		var geometry = getMesh('oil');
		var material = new THREE.MeshLambertMaterial({
			color: 0x181818
		});
		var oilMesh = new THREE.Mesh(geometry, material);
		oilMesh.scale.set(0.4, 0.4, 0.4);

		super(location, oilMesh);
		this.rate = rate;
		this.type = 'oil';
		this.uuid = uuid;
	}
}
