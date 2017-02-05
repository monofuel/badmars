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
import {
	updateUnit
} from './unitBalance.js';
import {
	MODE_FOCUS,
	buttonMode
} from '../client.js';

export class Entity {
	
	/* client stuff */
	mesh: THREE.Object3D;
	unitHeight: number;
	location: PlanetLoc;
	mesh: THREE.OBject3D;
	selectionCircle: THREE.Object3D;
	transferCircle: THREE.Object3D;
	damageSphere: THREE.Object3D;
	selectionSize: number;
	takingDamage: number;
	
	/* stuff from server */
	
	uuid: string;
	awake: boolean;
	
	details: {
		type: UnitType,
		size: number,
		buildTime: number,
		cost: number,
		health: number,
		maxHealth: number,
		tick: number,
		lastTick: number,
		ghosting: boolean,
		owner: string,
	}
	
	movable: ? {
		layer: MovementLayer,
		speed: number,
		movementCooldown: number,
		path: Array<any> , // TODO look up path type
		pathAttempts: number,
		pathAttemptAttempts: number,
		isPathing: boolean,
		pathUpdate: number,
		destination: ? TileHash,
		transferGoal: Object, // TODO why is this an object
	}
	attack: ? {
		layers: Array<MovementLayer> ,
		range: number,
		damage: number,
		fireRate: number,
		fireCooldown: number,
	}
	storage: ? {
		iron: number,
		fuel: number,
		maxIron: number,
		maxFuel: number,
		transferRange: number,
		resourceCooldown: number,
		transferGoal: ? {
			iron: ? number,
			fuel: ? number
		}
	}
	graphical: ? {
		model: string,
		scale: number,
	}
	stationary: ? {
		layer: MovementLayer,
	}
	construct: ? {
		types: Array<string> ,
		constructing: number,
		factoryQueue: Array<FactoryOrder> ,
	}

	constructor(location: PlanetLoc, mesh: THREE.Object3D) {
		this.type = 'entity';
		this.uuid = "";
		this.playerId = "";
		this.location = location;
		this.mesh = mesh;
		this.mesh.userData = this;
		this.unitHeight = 0.25;
		this.takingDamage = 0;
		this.ghosting = false;
		this.selectionSize = 1.1;
		this.factoryQueue = [];
		this.transferRange = 0;

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
		this.updateLoc();
	}

	updateLoc() {
		//re-generate the location in case if the chunk was not loaded the first time around
		this.location = this.location.clone();

		this.mesh.position.y = this.location.real_z + this.unitHeight;
		this.mesh.position.x = this.location.real_x;
		this.mesh.position.z = - this.location.real_y;
	}

	update(delta: number) {
		this.displayIfSelected();
		this.showTransferDistance();
		if (this.takingDamage) {
			this.animateSmoke();
		}
		if (this.ghosting) {
			this.mesh.material.transparent = true;
			this.mesh.material.opacity = 0.3;
		} else {
			this.mesh.material.transparent = false;
			this.mesh.material.opacity = 1;
		}

	}

	showTransferDistance() {
		if (buttonMode != MODE_FOCUS) {
			if (display && this.transferCircle) {
				display.removeMesh(this.transferCircle);
				this.transferCircle = null;
			}
			return;
		}

		if (this.transferCircle) {
			this.transferCircle.position.copy(this.mesh.position);
			this.transferCircle.position.y += 1;
		} else if (this.transferRange && this.transferRange > 0){
			var geometry = new THREE.CircleGeometry(this.transferRange, 32);
			var material = new THREE.MeshBasicMaterial({
				color: 0x0000ff,
				opacity: 0.05,
				transparent: true,
				depthWrite: false
			});
			this.transferCircle = new THREE.Mesh(geometry, material);
			this.transferCircle.rotation.x = -Math.PI / 2;
			this.transferCircle.position.copy(this.mesh.position);
			this.transferCircle.position.y += 1;
			if (display)
				display.addMesh(this.transferCircle);
		}
	}

	updateUnitData(unit: Object) {
		updateUnit(this);

		//UNIT UPDATE WHITELIST
		this.iron = unit.iron;
		this.fuel = unit.fuel;
		this.destination = unit.destination;
		this.ghosting = unit.ghosting;
		this.factoryQueue = unit.factoryQueue;
		this.health = unit.health;
	}

	takeDamage() {
		console.log('taking damage');
		if (display) {
			display.removeMesh(this.damageSphere); //TODO ugly hack, restarts animation
		}
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
				if (display) {
					display.removeMesh(this.damageSphere);
				}
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
			var geometry = new THREE.CircleGeometry(this.selectionSize, 12);
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
			if (this.selectionCircle) {
				display.removeMesh(this.selectionCircle);
			}
			if (this.damageSphere) {
				display.removeMesh(this.damageSphere);
			}
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
