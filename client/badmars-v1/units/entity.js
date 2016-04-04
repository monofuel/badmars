/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	N,
	S,
	E,
	W,
	C
} from './directions.js';
import {
	PlanetLoc
} from '../map/planetLoc.js';
import {
	Player
} from '../player.js';
import {
	selectedUnit,
	selectedUnits,
	display
} from '../client.js';

export class Entity {

	uid: string;
	playerId: string;
	type: string;
	mesh: THREE.Object3D;
	unitHeight: number;
	location: PlanetLoc;
	mesh: THREE.OBject3D;
	health: number;
	selectionCircle: THREE.Object3D | null;
	damageSphere: THREE.Object3D | null;

	maxStorage: number;
	storage: Object;

	constructor(location: PlanetLoc, mesh: THREE.Object3D) {
		this.type = 'entity';
		this.uid = "";
		this.playerId = "";
		this.location = location;
		this.mesh = mesh;
		this.mesh.userData = this;
		this.unitHeight = 0.25;
		this.takingDamage = 0;

		this.maxStorage = 0;
		this.storage = {
			iron: 0,
			oil: 0
		}

		if (!mesh) {
			console.log('invalid mesh for unit');
		}

		if (!location) {
			console.log('invalid location for unit');
		}

		if (display) {
			display.addMesh(this.mesh);
		}
		this.mesh.position.y = this.location.real_z + this.unitHeight;
		this.mesh.position.x = this.location.real_x;
		this.mesh.position.z = this.location.real_y;

	}

	update(delta: number) {
		this.displayIfSelected();
		if (this.takingDamage) {
			this.animateSmoke();
		}
	}

	takeDamage(source) {
		display.removeMesh(this.damageSphere); //TODO ugly hack, restarts animation.
		this.takingDamage = 1;
		this.animateSmoke();
	}

	animateSmoke() {
		if (this.damageSphere) {
			this.damageSphere.position.copy(this.mesh.position);
			this.damageSphere.position.y += this.takingDamage / 50;
			this.damageSphere.material.opacity -= 1 / 100;
			this.takingDamage++;

			if (this.takingDamage > 20) {
				display.removeMesh(this.damageSphere);
				this.takingDamage = 0;
				this.damageSphere = null;
			}
		} else {
			var geometry = new THREE.SphereGeometry(1.1, 12);
			var material = new THREE.MeshLambertMaterial({
				color: 0x595959,
				opacity: 0.6,
				transparent: true
			});
			this.damageSphere = new THREE.Mesh(geometry, material);
			this.damageSphere;
			this.damageSphere.position.copy(this.mesh.position);
			if (display)
				display.addMesh(this.damageSphere);

			console.log(this.mesh.position);
		}
	}

	displayIfSelected() {

		if ((!selectedUnit || selectedUnit != this) && (!selectedUnits || selectedUnits.indexOf(this) == -1)) {
			if (display && this.selectionCircle) {
				display.removeMesh(this.selectionCircle);
				this.selectionCircle = null;
			}
			return;
		}

		if (this.selectionCircle) {
			this.selectionCircle.position.copy(this.mesh.position);
		} else {
			var geometry = new THREE.CircleGeometry(1.1, 12);
			var material = new THREE.MeshBasicMaterial({
				color: 0x66FF00,
				wireframe: true
			});
			this.selectionCircle = new THREE.Mesh(geometry, material);
			this.selectionCircle.rotation.x = -Math.PI / 2;
			this.selectionCircle.position.copy(this.mesh.position);
			if (display)
				display.addMesh(this.selectionCircle);

			console.log(this.mesh.position);
		}

	}

	destroy() {
		console.log('removing ', this.type);
		if (display) {
			display.removeMesh(this.mesh);
		}
		if (this.selectionCircle) {
			display.removeMesh(this.selectionCircle);
		}
		if (this.damageSphere) {
			display.removeMesh(this.damageSphere);
		}
		if (this.location) {
			this.location.planet.removeUnit(this);
		}
	}

	/**
	 * Check if this unit is at the given location
	 * This method should be overrided by other classes.
	 * @param	{PlanetLoc}	location to check if this unit blocks it
	 * @return	{boolean> do we block it
	 */
	checkGroundTile(tile: PlanetLoc): boolean {
		return false;
	}
}
