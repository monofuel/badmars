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
import { log } from '../logger';

export default class Hilight {
	tile: PlanetLoc;
	hilightPlane: THREE.Mesh;
	color: number;
	deconstruct: boolean;
	state: State;

	constructor(state: State, tile?: PlanetLoc) {
		this.state = state;
		this.deconstruct = false;
		this.setGoodColor();
		this.updateLocation(tile);
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

	updateLocation(nextTile?: PlanetLoc) {
		const prevTile = this.tile;
		this.tile = nextTile;
		if (!this.tile) {
			return;
		}
		const { display, input, map } = this.state;
		const { mouseMode } = input;
		if (mouseMode !== 'focus') {
			log('debug', 'ran update on hilight with bad mouseMode', { mouseMode });
		}

		this.setGoodColor();

		if (this.deconstruct) {
			this.setBadColor();
			if (this.tile.planet.unitTileCheck(this.tile) != null) {
				this.setGoodColor();
			}
		} else {
			if (this.tile.tileType !== TILE_LAND) {
				this.setBadColor();
			}
			if (this.tile.planet.unitTileCheck(this.tile) != null) {
				this.setBadColor();
			}
		}

		if (!this.hilightPlane || !this.tile.equals(prevTile)) {
			console.log('new hilight tile', this.tile);
			const waterHeight = this.tile.planet.worldSettings.waterHeight + 0.1;
			const geometry = new THREE.Geometry();
			geometry.vertices.push(new THREE.Vector3(0, 0, Math.max(this.tile.corners[0], waterHeight)));
			geometry.vertices.push(new THREE.Vector3(1, 0, Math.max(this.tile.corners[1], waterHeight)));
			geometry.vertices.push(new THREE.Vector3(0, 1, Math.max(this.tile.corners[2], waterHeight)));
			geometry.vertices.push(new THREE.Vector3(1, 1, Math.max(this.tile.corners[3], waterHeight)));

			// 0 goes in bottom right

			geometry.faces.push(new THREE.Face3(0, 1, 2));
			geometry.faces.push(new THREE.Face3(1, 2, 3));


			geometry.computeBoundingSphere();
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();

			var material = new THREE.MeshBasicMaterial({
				color: this.color,
				side: THREE.DoubleSide
			});
			if (this.hilightPlane) {
				display.removeMesh(this.hilightPlane);
			}
			this.hilightPlane = new THREE.Mesh(geometry, material);
			this.hilightPlane.position.x = this.tile.x;
			this.hilightPlane.position.z = -this.tile.y;
			this.hilightPlane.position.y = 0.2;
			this.hilightPlane.rotation.x = -Math.PI / 2;
			display.addMesh(this.hilightPlane);
		}
	}

	destroy() {
		const { display } = this.state;
		display.removeMesh(this.hilightPlane);
		this.hilightPlane = null;
	}
}
