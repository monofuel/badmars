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
import {
	display
} from '../client.js';

export class GroundUnit extends Entity {
	nextTile: PlanetLoc | null;
	moving: boolean;
	speed: number;
	distanceMoved: number;
	timeToMove: number;
	health: number;
	maxHealth: number;
	fireSound: THREE.PositionalAudio;
	destination: string;
	hilightDestinationLocation: string;

	destHilightPlane: THREE.Mesh;

	constructor(location: PlanetLoc, mesh: THREE.Object3D) {
		super(location, mesh);
		this.nextTile = null;
		this.moving = false;
		this.distanceMoved = 0;
		this.timeToMove = 0;

	}

	fire(enemy: any) {
		if (this.fireSound) {
			console.log("firing");
			if (this.fireSound.isPlaying) {
				this.fireSound.stop();
			}
			//pew
			var sound = this.fireSound;
			var location = this.location;
			setTimeout(() => { //work around issue with 'audio already playing'
				sound.position.copy(location.getLoc());
				sound.play();
			},10);

		} else {
			console.log("no firing sound");
		}
	}

	//TODO should be refactored with updateUnitData
	updateHealth(amount: number) {
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
		this.hilightDestination();

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
				this.mesh.position.z = - this.location.real_y;
				this.distanceMoved = 0;
				this.timeToMove = 0;
				this.nextTile = null;
			}
		}
	}

	hilightDestination() {
		if (this.destination && !this.destHilightPlane && this.hilightDestinationLocation !== this.destination) {
			let destSplit = this.destination.split(":");
			let x = parseInt(destSplit[0]);
			let y = parseInt(destSplit[1]);
			let tile = new PlanetLoc(this.location.planet, x,y);
			this.hilightDestinationLocation = this.destination;

			var waterHeight = tile.planet.worldSettings.waterHeight + 0.1;
			var geometry = new THREE.Geometry();
			geometry.vertices.push(new THREE.Vector3(0, 0, Math.max(tile.corners[0], waterHeight)));
			geometry.vertices.push(new THREE.Vector3(1, 0, Math.max(tile.corners[1], waterHeight)));
			geometry.vertices.push(new THREE.Vector3(0, 1, Math.max(tile.corners[2], waterHeight)));
			geometry.vertices.push(new THREE.Vector3(1, 1, Math.max(tile.corners[3], waterHeight)));

			//0 goes in bottom right

			geometry.faces.push(new THREE.Face3(0, 1, 2));
			geometry.faces.push(new THREE.Face3(1, 2, 3));


			geometry.computeBoundingSphere();
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();

			var material = new THREE.MeshBasicMaterial({
				color: 0xB2C248,
				side: THREE.DoubleSide
			});
			if (this.destHilightPlane && display) {
				display.removeMesh(this.destHilightPlane);
			}
			this.destHilightPlane = new THREE.Mesh(geometry, material);
			this.destHilightPlane.position.x = x;
			this.destHilightPlane.position.z = - y;
			this.destHilightPlane.position.y = 0.2;
			this.destHilightPlane.rotation.x = -Math.PI / 2;
			if (display) {
				display.addMesh(this.destHilightPlane);
			}

		} else {
			if (!this.destination && this.destHilightPlane) {
				if (display) {
					display.removeMesh(this.destHilightPlane);
					this.destHilightPlane = null;
				}
			}
		}
	}

	checkGroundTile(tile: PlanetLoc): boolean {
		return tile.equals(this.location);
	}
}
