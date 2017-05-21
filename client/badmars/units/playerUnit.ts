// monofuel

import GroundUnit from './groundUnit';
import PlanetLoc from '../map/planetLoc';
import { getMesh } from './unitModels';
import { getSound } from '../audio/sound';
import Player from '../player';
import State from '../state';
import * as THREE from 'three';

export default class PlayerUnit extends GroundUnit {
	constructor(state: State, location: PlanetLoc, userUUID: UUID, uuid: string, type: string, scale: number) {
		const player = state.getPlayerByUUID(userUUID);
		let color;
		if (!player || !player.color) {
			console.log('player missing color: ', JSON.stringify(player));
			color = new THREE.Color();
		} else {
			color = player.color;
		}

		super(state, location, uuid, color, type, scale);

		// this.fireSound = getSound(type);
	}
}
