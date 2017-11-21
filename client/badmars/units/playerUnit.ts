// monofuel

import GroundUnit from './groundUnit';
import PlanetLoc from '../map/planetLoc';
import { getMesh } from './unitModels';
import { getSound } from '../audio/sound';
import State, { getPlayerByUUID } from '../state';
import * as THREE from 'three';

export default class PlayerUnit extends GroundUnit {
	constructor(state: State, location: PlanetLoc, userUUID: UUID, uuid: string, type: string, scale: number) {
		const player = getPlayerByUUID(state, userUUID);
		// TODO flag system
		const color = new THREE.Color();


		super(state, location, uuid, color, type, scale);

		// this.fireSound = getSound(type);
	}
}
