// monofuel

import Map from './map';
import {
	getTypeName,
	TILE_LAND,
	TILE_WATER,
	TILE_CLIFF,
	TILE_COAST
} from './tileTypes';
import * as THREE from 'three';

/**
 * Representation of a point on a planet
 */
export class PlanetLoc {
	planet: Map;
	x: number;
	y: number;
	real_x: number;
	real_y: number;
	real_z: number;
	tileType: Symbol;
	corners: Array<number>;
	chunk: any;
	chunkX: number;
	chunkY: number;
	localX: number; // local is 0 through 16 (chunk size)
	localY: number;

	/**
	 * @param  {Map}     The map this location is on
	 * @param  {Number}  The X coordinate
	 * @param  {Number}  The Y coordinate
	 */
	constructor(planet: Map, x: number, y: number, skipChunk?: boolean) {
		this.planet = planet;

		// TODO should refer to the local x as local_x and real_x as just regular x
		// dear god why did i name it this way
		this.real_x = Math.floor(x);
		this.real_y = Math.floor(y);

		this.chunkX = Math.floor(this.real_x / this.planet.worldSettings.chunkSize);
		this.chunkY = Math.floor(this.real_y / this.planet.worldSettings.chunkSize);
		this.x = this.real_x - (this.chunkX * this.planet.worldSettings.chunkSize);
		this.y = this.real_y - (this.chunkY * this.planet.worldSettings.chunkSize);

		if (this.x < 0) {
			this.x = this.x + this.planet.worldSettings.chunkSize;
			this.chunkX--;
		}

		if (this.y < 0) {
			this.y = this.y + this.planet.worldSettings.chunkSize;
			this.chunkY--;
		}

		this.localX = x - (this.chunkX * this.planet.worldSettings.chunkSize);
		this.localY = y - (this.chunkY * this.planet.worldSettings.chunkSize);

		this.chunk = gameState.chunks[this.chunkX + ':' + this.chunkY];

		if (!planet || !gameState.chunks) {
			console.log('invalid call to PlanetLoc');
			console.log(new Error()
				.stack);
			console.log(this.toString());
			return;
		}
		if (!this.chunk) {
			// console.log("tile on not loaded chunk: " + this.real_x + "," + this.real_y);
			// console.log('chunk hash: ' + this.chunkX + ":" + this.chunkY);
			if (!skipChunk) {
				// console.log('requesting');
				planet.requestChunk(this.chunkX, this.chunkY);
			}
			return;
		}

		if (this.x < 0 || this.x > this.planet.worldSettings.chunkSize ||
			this.y < 0 || this.y > this.planet.worldSettings.chunkSize) {
			console.log('invalid tile: ' + this.real_x + ',' + this.real_y);
			console.log('local coords: ' + this.x + ',' + this.y);
			console.log('chunk hash: ' + this.chunkX + ':' + this.chunkY);
		}

		this.corners = [
			this.chunk.grid[this.x][this.y],
			this.chunk.grid[this.x + 1][this.y],
			this.chunk.grid[this.x][this.y + 1],
			this.chunk.grid[this.x + 1][this.y + 1]
		];

		var avg = (this.corners[0] +
			this.corners[1] +
			this.corners[2] +
			this.corners[3]) / 4;
		if (avg < this.planet.worldSettings.waterHeight) {
			this.real_z = this.planet.worldSettings.waterHeight;
		} else {
			this.real_z = avg;
		}
		if (this.chunk.navGrid) {
			switch (this.chunk.navGrid[this.x][this.y]) {
				case 0:
					this.tileType = TILE_LAND;
					break;
				case 1:
					this.tileType = TILE_CLIFF;
					break;
				case 2:
					this.tileType = TILE_WATER;
					break;
				case 3:
					this.tileType = TILE_COAST;
					break;
			}
		} else {
			this.tileType = TILE_LAND;
		}
		this.real_x = this.real_x + 0.5;
		this.real_y = this.real_y + 0.5;

	}

	distance(tile: PlanetLoc): number {
		var deltaX = Math.abs(this.real_x - tile.real_x);
		var deltaY = Math.abs(this.real_y - tile.real_y);

		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

	clone() {
		let newLoc = new PlanetLoc(this.planet, this.real_x, this.real_y);
		return newLoc;
	}

	/**
	 * @return {THREE.Vector3} Get the real location in the world
	 */
	getLoc(): THREE.Vector3 {
		return new THREE.Vector3(this.real_x, this.real_z, - this.real_y);
	}
	/**
	 * @return {String}  Debug information for the tile
	 */
	toString(): string {
		var line = "x: " + this.real_x;
		line += ", y: " + this.real_y;
		line += ", type: " + getTypeName(this.tileType);
		if (this.planet && this.planet.worldSettings) {
			line += ", planet: " + this.planet.worldSettings.name;
		}
		return line;
	}

	/**
	 * @return {PlanetLoc} Tile to the west
	 */
	W(): PlanetLoc {
		return new PlanetLoc(this.planet, this.real_x - 1, this.real_y);
	}
	/**
	 * @return {PlanetLoc} Tile to the east
	 */
	E(): PlanetLoc {
		return new PlanetLoc(this.planet, this.real_x + 1, this.real_y);
	}
	/**
	 * @return {PlanetLoc} Tile to the south
	 */
	S(): PlanetLoc {
		return new PlanetLoc(this.planet, this.real_x, this.real_y - 1);
	}
	/**
	 * @return {PlanetLoc} Tile to the north
	 */
	N(): PlanetLoc {
		return new PlanetLoc(this.planet, this.real_x, this.real_y + 1);
	}

	// Get the 3D location in the game world of the middle of the tile
	public getVec(): THREE.Vector3 {
		return new THREE.Vector3(this.real_x, this.real_z, - this.real_y);
	}

	// Get the angle of the surface
	public getEuler(): THREE.Euler {
		const geom = new THREE.Geometry();
		geom.vertices.push(new THREE.Vector3(0, 0, this.corners[0]));
		geom.vertices.push(new THREE.Vector3(1, 0, this.corners[1]));
		geom.vertices.push(new THREE.Vector3(0, 1, this.corners[2]));
		geom.vertices.push(new THREE.Vector3(1, 1, this.corners[3]));

		geom.faces.push(new THREE.Face3(0, 1, 2));
		geom.faces.push(new THREE.Face3(1, 2, 3));
		geom.computeFaceNormals();

		const landVector1 = geom.faces[0].normal;
		const landVector2 = geom.faces[1].normal;
		let newVec = landVector1.clone();
		newVec.add(landVector2);
		newVec = newVec.divideScalar(2);

		return (new THREE.Euler()).setFromVector3(newVec);
	}

	/**
	 * Compare with another PlanetLoc for equality by value
	 * @param  {PlanetLoc} Location to compare to
	 * @return {boolean}   Equality
	 */
	equals(otherLoc: PlanetLoc): boolean {
		if (!otherLoc) {
			return false;
		}
		return (otherLoc.real_x == this.real_x &&
			otherLoc.real_y == this.real_y &&
			otherLoc.planet == this.planet);
	}
}

export default PlanetLoc;