// monofuel

import PlanetLoc from '../map/planetLoc';
import Entity from './entity';
import { getMesh } from './unitModels';
import State from '../state';
import * as THREE from 'three';

export default class Iron extends Entity {
	rate: number;
	constructor(state: State, location: PlanetLoc, rate: number, uuid: string, scale: number) {
		super(state, location, uuid, new THREE.Color(0xF8F8F8), 'iron', scale);
		this.rate = rate;
	}
}
