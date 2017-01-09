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
import {
	updateUnit
} from './unitBalance.js';

export class Mine extends Entity {
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

		var geometry = getMesh('mine');
		var material = new THREE.MeshLambertMaterial({
			color: color
		});
		if (geometry) {
			var storageMesh = new THREE.Mesh(geometry, material);
			storageMesh.scale.set(1.1, 1.1, 1.1);

			super(location, storageMesh);
		} else {
			console.log("failed to get mine mesh!");
			super(location, null);
		}
		this.type = 'mine';
		this.uuid = uuid;
		this.playerId = playerId;
		updateUnit(this);
	}
}
