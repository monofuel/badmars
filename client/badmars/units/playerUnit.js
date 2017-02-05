/* @flow */
'use strict';

// monofuel
// 2-7-2016

import GroundUnit from "./groundUnit.js";
import { PlanetLoc } from '../map/planetLoc.js';
import { getMesh } from './unitModels.js';
import { getSound } from '../audio/sound.js';
import { getPlayerById } from '../net.js';

export default class PlayerUnit extends GroundUnit {
	constructor(location: PlanetLoc, playerId: string, uuid: string, type: string) {
		if (!playerId) {
			throw new Error('missing player');
		}
		if (!location) {
			throw new Error('missing location');
		}
		if (!uuid) {
			throw new Error('missing uuid');
		}

		const player = getPlayerById(playerId);
		let color;
		if (!player || !player.color) {
			console.log('unknown player color');
			color = new THREE.Color();
		} else {
			color = player.color;
		}

		super(location, uuid, color, type);

		this.fireSound = getSound(type);
	}
}
