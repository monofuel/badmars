// monofuel

import { PlanetLoc } from '../map/planetLoc';
import Entity from './entity';
import { getMesh } from './unitModels';
import State from '../state';
import * as THREE from 'three';

export default class Oil extends Entity {
	rate: number;
	constructor(state: State, location: PlanetLoc, rate: number, uuid: string, scale: number) {
		super(state, location, uuid, new THREE.Color(0x181818), 'oil', scale);
		this.rate = rate;
	}
}
