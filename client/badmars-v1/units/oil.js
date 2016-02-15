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

export class Oil extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number) {
		var geometry = new THREE.BoxGeometry(0.75, 0.75, 0.75);
		var material = new THREE.MeshLambertMaterial({
			color: 0x181818
		});
		var cube = new THREE.Mesh(geometry, material);

		super(location, cube);
		this.rate = rate;
		this.type = 'oil';
	}
}
