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

export class Storage extends Entity {
	constructor(location: PlanetLoc, playerId: string, uid: string) {
		var player = getPlayerById(playerId);
		var color;
		if (!player || !player.color) {
			console.log('unknown player color');
			color = new THREE.Color();
		} else {
			color = player.color;
		}
		var geometry = getMesh('storage');
		var material = new THREE.MeshLambertMaterial({
			color: color
		});
		if (geometry) {
			var storageMesh = new THREE.Mesh(geometry, material);
			storageMesh.scale.set(1.3, 1.3, 1.3);

			super(location, storageMesh);
		} else {
			console.log("failed to get storage mesh!");
			super(location, null);
		}
		this.type = 'storage';
		this.uid = uid;
		this.playerId = playerId;
		this.selectionSize = 2;
	}
}
