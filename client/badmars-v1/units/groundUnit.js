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
	nextMove: Symbol;
	nextTile: PlanetLoc | null;
	moving: boolean;
	speed: number;
	distanceMoved: number;

	constructor(location: PlanetLoc, mesh: THREE.Object3D) {
		super(location, mesh);
		this.nextMove = C;
		this.nextTile = null;
		this.moving = false;
		this.speed = 1;
		this.distanceMoved = 0;

	}

	updateNextMove(dir: Symbol) {
		this.nextMove = dir;
	}

	selection() {

	}

	update(delta: number) {
		super.update(delta);
		this.selection();

		var deltaMove = this.speed * delta;
		var deltaHeight = 0;

		if (this.nextTile) {
			deltaHeight = this.speed * delta * (this.nextTile.real_z - this.location.real_z)
		}

		if (this.nextMove != C) {
			this.distanceMoved += deltaMove;
			if (this.distanceMoved > 1) {
				this.distanceMoved = 1;
			}
		}

		switch (this.nextMove) {
			case N:
				if (this.distanceMoved < 1) {
					this.mesh.position.z -= deltaMove;
					this.mesh.position.y += deltaHeight;
				}

				this.moving = true;
				break;
			case S:
				if (this.distanceMoved < 1) {
					this.mesh.position.z += deltaMove;
					this.mesh.position.y += deltaHeight;
				}

				this.moving = true;
				break;
			case E:
				if (this.distanceMoved < 1) {
					this.mesh.position.x += deltaMove;
					this.mesh.position.y += deltaHeight;
				}

				this.moving = true;
				break;
			case W:
				if (this.distanceMoved < 1) {
					this.mesh.position.x -= deltaMove;
					this.mesh.position.y += deltaHeight;
				}

				this.moving = true;
			case C:
				this.moving = false;
				break;
		}

		if (this.distanceMoved == 1 && this.nextTile) {
			this.location = this.nextTile;
			this.moving = false;
			this.mesh.position.x = this.location.real_x;
			this.mesh.position.y = this.location.real_y + this.unitHeight;
			this.mesh.position.z = this.location.real_z;

			this.distanceMoved = 0;
		}
	}
	checkGroundTile(tile: PlanetLoc): boolean {
		return tile.equals(this.location);
	}
}
