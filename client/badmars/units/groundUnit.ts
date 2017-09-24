// monofuel

import PlanetLoc from '../map/planetLoc';
import Entity from './entity';
import { N, S, E, W, C } from './directions';
import State from '../state';
import * as THREE from 'three';

export default class GroundUnit extends Entity {
	nextTile: PlanetLoc | null;
	moving: boolean;
	speed: number;
	distanceMoved: number;
	timeToMove: number;
	health: number;
	maxHealth: number;
	fireSound: THREE.PositionalAudio;
	hilightDestinationLocation: TileHash;

	destHilightPlane: THREE.Mesh;

	constructor(state: State, location: PlanetLoc, uuid: string, color: THREE.Color, type: string, scale: number) {
		super(state, location, uuid, color, type, scale);
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
			const loc = this.loc;
			setTimeout(() => { // work around issue with 'audio already playing'
				sound.position.copy(loc.getLoc());
				sound.play();
			}, 10);

		} else {
			console.log("no firing sound");
		}
	}

	// TODO should be refactored with updateUnitData
	updateHealth(amount: number) {
		this.health = amount;
	}

	updateNextMove(tile: PlanetLoc, time: number) {
		this.nextTile = tile;
		this.timeToMove = time;
		// I wish i knew what i was doing
		const angle = tile.getEuler().toVector3().add(
			new THREE.Vector3(-Math.PI / 2, 0,0)
		);
		const x = (this.loc.x - tile.x) * (Math.PI / 2);
		const y = ((this.loc.y - tile.y) * Math.PI);
		console.log(y);
		angle.z = x + y;
		this.mesh.setRotationFromEuler((new THREE.Euler()).setFromVector3(angle));
	}

	selection() {

	}

	update(delta: number) {
		super.update(delta);
		this.selection();
		this.hilightDestination();

		// this code is bad and i should feel bad
		if (this.movable && (this.loc.real_x - 0.5 !== this.location.x || this.loc.real_y - 0.5 !== this.location.y)) {
			const nextTile = new PlanetLoc(
				this.loc.planet,
				this.location.x,
				this.location.y
			);
			if (!this.loc.equals(nextTile)) {
				this.updateNextMove(nextTile, this.movable.speed / 2); // TODO should divide by tickrate
			}
		}

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
				this.loc = this.nextTile;
				this.moving = false;
				this.mesh.position.x = this.loc.real_x;
				this.mesh.position.y = this.loc.real_z + this.unitHeight;
				this.mesh.position.z = - this.loc.real_y;
				this.distanceMoved = 0;
				this.timeToMove = 0;
				this.nextTile = null;
			}
		}
	}

	hilightDestination() {
		const { display } = this.state;
		if (!this.movable || !this.movable.destination) {
			return;
		}
		const dest: TileHash = this.movable.destination;
		if (!this.destHilightPlane || this.hilightDestinationLocation !== dest) {
			let destSplit = this.movable.destination.split(":");
			let x = parseInt(destSplit[0]);
			let y = parseInt(destSplit[1]);
			let tile = new PlanetLoc(this.loc.planet, x, y);
			if (!tile.corners) {
				return;
			}
			this.hilightDestinationLocation = dest;

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
			if (!this.movable.destination && this.destHilightPlane) {
				if (display) {
					display.removeMesh(this.destHilightPlane);
					this.destHilightPlane = null;
				}
			}
		}
	}

	checkGroundTile(tile: PlanetLoc): boolean {
		return tile.equals(this.loc);
	}
}
