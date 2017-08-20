// monofuel

import { N, S, E, W, C } from './directions';
import PlanetLoc from '../map/planetLoc';
import Player from '../player';
import State from '../state';
import { updateUnit } from './unitBalance';
import { getMesh } from './unitModels';
import { log } from '../logger';
import * as THREE from 'three';

export default class Entity {

	/* client stuff */
	mesh: THREE.Group;
	unitHeight: number;
	loc: PlanetLoc;
	selectionCircle: THREE.Object3D;
	transferCircle: THREE.Object3D;
	damageSphere: THREE.Mesh;
	selectionSize: number;
	takingDamage: number;
	state: State;

	/* stuff from server */

	uuid: string;
	awake: boolean;

	details: {
		type: string,
		size: number,
		buildTime: number,
		cost: number,
		health: number,
		maxHealth: number,
		tick: number,
		lastTick: number,
		ghosting: boolean,
		owner: string,
	};

	location: {
		hash: string[],
		x: number,
		y: number,
		chunkHash: string[],
		chunkX: number,
		chunkY: number,
		map: string,
	};

	movable?: {
		layer: string,
		speed: number,
		movementCooldown: number,
		path: Array<any>, // TODO look up path type
		pathAttempts: number,
		pathAttemptAttempts: number,
		isPathing: boolean,
		pathUpdate: number,
		destination: TileHash | null,
		transferGoal: Object, // TODO why is this an object
	};

	attack?: {
		layers: string[],
		range: number,
		damage: number,
		fireRate: number,
		fireCooldown: number,
	};

	storage?: {
		iron: number,
		fuel: number,
		maxIron: number,
		maxFuel: number,
		transferRange: number,
		resourceCooldown: number,
		transferGoal?: {
			iron: number,
			fuel: number
		}
	};

	graphical?: {
		model: string,
		scale: number,
	};
	stationary?: {
		layer: string,
	};
	construct?: {
		types: string[],
		constructing: number,
		factoryQueue: any[], // TODO type this
	};

	constructor(state: State, loc: PlanetLoc, uuid: string, color: THREE.Color, type: string, scale: number) {
		this.state = state;
		const { display } = state;
		if (!loc) {
			throw new Error('missing location');
		}
		if (!color) {
			throw new Error('missing color');
		}
		this.uuid = uuid;
		this.loc = loc;
		this.unitHeight = 0.25;
		this.takingDamage = 0;
		this.selectionSize = 1.1;

		// const material = new THREE.MeshLambertMaterial({ color: color.getHex() });

		this.refreshMesh(type, scale);
	}

	public refreshMesh(type?: string, scale?: number) {
		const { display } = this.state;
		if (this.mesh) {
			display.removeMesh(this.mesh);
		}
		if (!type) {
			type = this.details.type;
		}
		if (!scale) {
			scale = this.graphical.scale;
		}
		const geometry = getMesh(type);
		if (geometry.children.length === 0) {
			log('warn', 'no geometry ready yet', { type });
		}
		this.mesh = new THREE.Group();
		this.mesh.copy(geometry, true);
		this.mesh.scale.set(scale, scale, scale);
		this.mesh.rotation.x = -Math.PI / 2;
		this.mesh.userData = this;

		display.addMesh(this.mesh);
		this.updateLoc();

	}

	updateLoc() {
		//re-generate the location in case if the chunk was not loaded the first time around
		this.loc = this.loc.clone();

		this.mesh.position.y = this.loc.real_z + this.unitHeight;
		this.mesh.position.x = this.loc.real_x;
		this.mesh.position.z = - this.loc.real_y;
	}

	update(delta: number) {
		this.displayIfSelected();
		this.showTransferDistance();
		if (this.takingDamage) {
			this.animateSmoke();
		}
		// TODO fix ghosting this
		/*
		if (this.details.ghosting) {
			this.mesh.material.transparent = true;
			this.mesh.material.opacity = 0.3;
		} else {
			this.mesh.material.transparent = false;
			this.mesh.material.opacity = 1;
		}
		*/

	}

	showTransferDistance() {
		const { display } = this.state;
		if (!this.storage || !this.storage.transferRange) {
			return;
		}

		if (this.state.input.mouseMode !== 'focus') {
			if (display && this.transferCircle) {
				display.removeMesh(this.transferCircle);
				this.transferCircle = null;
			}
			return;
		}

		if (this.transferCircle) {
			this.transferCircle.position.copy(this.mesh.position);
			this.transferCircle.position.y += 1;
		} else if (this.storage.transferRange && this.storage.transferRange > 0) {
			var geometry = new THREE.CircleGeometry(this.storage.transferRange, 32);
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

	public updateUnitData(unit: Object) {
		updateUnit(this);
		// TODO this is fubared, is it even needed?
		/*
		//UNIT UPDATE WHITELIST
		this.details.ghosting = unit.ghosting;
		this.details.health = unit.health;

		if (this.storage) {
			this.storage.iron = unit.iron;
			this.storage.fuel = unit.fuel;
		}
		if (this.movable) {
				this.movable.destination = unit.destination;
		}
		if (this.construct) {
			this.construct.factoryQueue = unit.factoryQueue;
		}
	*/
	}

	takeDamage() {
		const { display } = this.state;
		console.log('taking damage');
		display.removeMesh(this.damageSphere); // HACK, restarts animation
		this.takingDamage = 1;
		this.animateSmoke();
	}

	animateSmoke() {
		const { display } = this.state;
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
		const { selectedUnits, display } = this.state;

		if (selectedUnits.indexOf(this) === -1) {
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
		const { display } = this.state;
		console.log('removing ', this.details.type);
		if (display) {
			display.removeMesh(this.mesh);
			if (this.selectionCircle) {
				display.removeMesh(this.selectionCircle);
			}
			if (this.damageSphere) {
				display.removeMesh(this.damageSphere);
			}
		}
		if (this.loc) {
			this.loc.planet.removeUnit(this);
		}
	}

	/**
	 * Check if this unit is at the given location
	 * This method should be overrided by other classes.
	 * @param	{PlanetLoc}	location to check if this unit blocks it
	 * @return	{boolean} do we block it
	 */
	checkGroundTile(tile: PlanetLoc): boolean {
		return false;
	}
}
