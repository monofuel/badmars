/* @flow */
'use strict';

// monofuel
// 4-11-2016

import {
	GroundUnit
} from "./groundUnit.js";
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

export class Builder extends GroundUnit {
	constructor(location: PlanetLoc, playerId: string, uuid: string) {
		var player = getPlayerById(playerId);
		var color;
		if (!player || !player.color) {
			console.log('unknown player color');
			color = new THREE.Color();
		} else {
			color = player.color;
		}

		var geometry = getMesh('builder');
		var material = new THREE.MeshLambertMaterial({
			color: color
		});
		if (geometry) {
			var builderMesh = new THREE.Mesh(geometry, material);
			builderMesh.scale.set(0.4, 0.4, 0.4);

			super(location, builderMesh);
		} else {
			console.log("failed to get builder mesh!");
			super(location, null);
		}
		this.type = 'builder';
		this.uuid = uuid;
		this.playerId = playerId
	}
}
