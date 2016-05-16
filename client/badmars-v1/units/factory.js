/* @flow */
'use strict';

// monofuel
// 4-15-2016

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

export class Factory extends Entity {
	constructor(location: PlanetLoc, playerId: string, uuid: string) {
		var player = getPlayerById(playerId);
		var color;
		if (!player || !player.color) {
			console.log('unknown player color');
			color = new THREE.Color();
		} else {
			color = player.color;
		}
		var geometry = getMesh('factory');
		var material = new THREE.MeshLambertMaterial({
			color: color
		});
		if (geometry) {
			var storageMesh = new THREE.Mesh(geometry, material);
			storageMesh.scale.set(1.1, 1.1, 1.1);

			super(location, storageMesh);
		} else {
			console.log("failed to get factory mesh!");
			super(location, null);
		}
		this.type = 'factory';
		this.uuid = uuid;
		this.playerId = playerId;
		this.selectionSize = 2;
	}
}
