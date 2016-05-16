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
import {
	getPlayerById
} from '../net.js';

export class Wall extends Entity {
	maxStorage: number;

	constructor(location: PlanetLoc, playerId: string, uuid: string) {
		var player = getPlayerById(playerId);
		var color;
		if (!player || !player.color) {
			console.log('unknown player color');
			color = new THREE.Color();
		} else {
			color = player.color;
		}

		var geometry = new THREE.BoxGeometry( 0.9, 0.9, 0.9 );
		var material = new THREE.MeshLambertMaterial({
			color: color
		});
		if (geometry) {
			var wallMesh = new THREE.Mesh(geometry, material);
			wallMesh.scale.set(1.1, 1.1, 1.1);

			super(location, wallMesh);
		} else {
			console.log("failed to get wall mesh!");
			super(location, null);
		}
		this.type = 'wall';
		this.uuid = uuid;
		this.playerId = playerId
	}
}
