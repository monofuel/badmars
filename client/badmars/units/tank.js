/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	GroundUnit
} from "./groundUnit.js";
import {
	PlanetLoc
} from '../map/planetLoc.js';
import {
	getMesh
} from './unitModels.js';
import {
	getSound
} from '../audio/sound.js';
import {
	getPlayerById
} from '../net.js';
import {
	updateUnit
} from './unitBalance.js';


export class Tank extends GroundUnit {
	constructor(location: PlanetLoc, playerId: string, uuid: string) {
		var player = getPlayerById(playerId);
		var color;
		if (!player || !player.color) {
			console.log('unknown player color');
			color = new THREE.Color();
		} else {
			color = player.color;
		}

		var material = new THREE.MeshLambertMaterial({
			color: color
		});

		var geometry = getMesh('tank');
		if (geometry) {
			var tankMesh = new THREE.Mesh(geometry, material);
			tankMesh.scale.set(0.3, 0.3, 0.3);

			super(location, tankMesh);
		} else {
			console.log("failed to get tank mesh!");
			super(location, null);
		}
		this.fireSound = getSound('tank');
		this.type = 'tank';
		this.uuid = uuid;
		this.playerId = playerId;
		updateUnit(this);
	}
}
