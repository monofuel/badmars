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

export class GroundUnit extends Entity {
	nextTile: PlanetLoc | null;
	moving: boolean;
	speed: number;
	distanceMoved: number;
	timeToMove: number;
	health: number;
	maxHealth: number;
	fireSound: THREE.PositionalAudio;

	constructor(location: PlanetLoc, mesh: THREE.Object3D) {
		super(location, mesh);
		this.nextTile = null;
		this.moving = false;
		this.distanceMoved = 0;
		this.timeToMove = 0;

	}

	updateHealth(amount) {
		this.health = amount;
	}

	updateNextMove(tile: PlanetLoc, time: number) {
		this.nextTile = tile;
		this.timeToMove = time;
		this.mesh.lookAt(tile.getVec());
	}

	selection() {

	}

	update(delta: number) {
		super.update(delta);
		this.selection();

		var deltaMove = 0;
		if (this.timeToMove != 0)
			deltaMove = delta / this.timeToMove;

		if (this.nextTile) {

			this.distanceMoved += deltaMove;
			if (this.distanceMoved > 1) {
				this.distanceMoved = 1;
			}


			var deltaVec = this.nextTile.getVec()
				.clone();
			deltaVec.y += this.unitHeight;
			deltaVec.sub(this.mesh.position)
				.normalize()
				.multiplyScalar(deltaMove);
			this.mesh.position.add(deltaVec);



			if (this.distanceMoved == 1 && this.nextTile) {
				this.location = this.nextTile;
				this.moving = false;
				this.mesh.position.x = this.location.real_x;
				this.mesh.position.y = this.location.real_z + this.unitHeight;
				this.mesh.position.z = this.location.real_y;
				this.distanceMoved = 0;
				this.timeToMove = 0;
				this.nextTile = null;
			}
		}
	}
	checkGroundTile(tile: PlanetLoc): boolean {
		return tile.equals(this.location);
	}
}
