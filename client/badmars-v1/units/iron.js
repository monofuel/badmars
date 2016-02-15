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

export class Iron extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uid: string) {
		var geometry = new THREE.BoxGeometry(0.75, 0.75, 0.75);
		var material = new THREE.MeshLambertMaterial({
			color: 0xF8F8F8
		});
		var cube = new THREE.Mesh(geometry, material);

		super(location, cube);
		this.rate = rate;
		this.type = 'iron';
		this.uid = uid;
	}
}
