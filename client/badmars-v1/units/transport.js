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


export class Transport extends GroundUnit {
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

		var geometry = getMesh('transport');
		if (geometry) {
			var tankMesh = new THREE.Mesh(geometry, material);
			tankMesh.scale.set(0.3, 0.3, 0.3);

			super(location, tankMesh);
		} else {
			console.log("failed to get transport mesh!");
			super(location, null);
		}
		this.type = 'transport';
		this.uuid = uuid;
		this.playerId = playerId;
	}
}
