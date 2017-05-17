// monofuel

import { PlanetLoc } from '../map/planetLoc';
import {
	getTypeName,
	TILE_LAND,
	TILE_WATER,
	TILE_CLIFF,
	TILE_COAST
} from '../map/tileTypes';
import State from '../state';
import * as THREE from 'three';
import { MouseReleaseEvent } from '../input';

export default class Hilight {
	enabled: boolean;
	location: number[];
	hilightPlane: THREE.Mesh;
	color: number;
	deconstruct: boolean;
	state: State;

	constructor(state: State) {
		this.state = state;
		this.enabled = false;
		this.deconstruct = false;
		this.setGoodColor();
	}

	setGoodColor() {
		this.color = 0x7FFF00;
	}

	setBadColor() {
		console.log('setting bad color');
		this.color = 0xDC1403;
	}

	setDeconstruct(bool: boolean) {
		this.deconstruct = bool;
	}

	update() {
		const { display, input, map } = this.state;
		const { mouseMode } = input;
		if (mouseMode !== 'focus') {
			this.enabled = false;
		}

		if (mouseMode === 'focus' && !this.enabled) {
			this.enabled = true;
			const thisHilight = this;

			input.mouseAction = ({ event }: MouseReleaseEvent) => {

				let mouse = new THREE.Vector2();
				mouse.x = (event.clientX / display.renderer.domElement.clientWidth) * 2 - 1
				mouse.y = -(event.clientY / display.renderer.domElement.clientHeight) * 2 + 1
				const selectedTile = map.getTileAtRay(mouse);
				this.setGoodColor();
				if (!selectedTile || !selectedTile.tileType) {
					return;
				}
				if (this.deconstruct) {
					this.setBadColor();
					if (selectedTile.planet.unitTileCheck(selectedTile) != null) {
						this.setGoodColor();
					}
				} else {
					if (selectedTile.tileType !== TILE_LAND) {
						this.setBadColor();
					}
					if (selectedTile.planet.unitTileCheck(selectedTile) != null) {
						this.setBadColor();
					}
				}

				const newLoc = [Math.round(selectedTile.real_x - 0.5), Math.round(selectedTile.real_y - 0.5)];
				if (!thisHilight.location || this.location.length !== 2 || newLoc[0] !== thisHilight.location[0] || newLoc[1] !== thisHilight.location[1]) {
					thisHilight.location = newLoc;
					const waterHeight = selectedTile.planet.worldSettings.waterHeight + 0.1;
					const geometry = new THREE.Geometry();
					geometry.vertices.push(new THREE.Vector3(0, 0, Math.max(selectedTile.corners[0], waterHeight)));
					geometry.vertices.push(new THREE.Vector3(1, 0, Math.max(selectedTile.corners[1], waterHeight)));
					geometry.vertices.push(new THREE.Vector3(0, 1, Math.max(selectedTile.corners[2], waterHeight)));
					geometry.vertices.push(new THREE.Vector3(1, 1, Math.max(selectedTile.corners[3], waterHeight)));

					// 0 goes in bottom right

					geometry.faces.push(new THREE.Face3(0, 1, 2));
					geometry.faces.push(new THREE.Face3(1, 2, 3));


					geometry.computeBoundingSphere();
					geometry.computeFaceNormals();
					geometry.computeVertexNormals();

					var material = new THREE.MeshBasicMaterial({
						color: thisHilight.color,
						side: THREE.DoubleSide
					});
					if (thisHilight.hilightPlane) {
						display.removeMesh(thisHilight.hilightPlane);
					}
					thisHilight.hilightPlane = new THREE.Mesh(geometry, material);
					thisHilight.hilightPlane.position.x = thisHilight.location[0];
					thisHilight.hilightPlane.position.z = -thisHilight.location[1];
					thisHilight.hilightPlane.position.y = 0.2;
					thisHilight.hilightPlane.rotation.x = -Math.PI / 2;
					display.addMesh(thisHilight.hilightPlane);
				}
			};
		}

		if (!this.enabled) {
			if (this.hilightPlane) {
				display.removeMesh(this.hilightPlane);
				this.hilightPlane = null;
			}
		}
	}
}
