/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	Map
} from './map.js';
import {
	getTypeName,
	TILE_LAND,
	TILE_WATER,
	TILE_CLIFF,
	TILE_COAST
} from './tileTypes.js';


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
	chunk;

	/**
	 * @param  {Map}     The map this location is on
	 * @param  {Number}  The X coordinate
	 * @param  {Number}  The Y coordinate
	 */
	constructor(planet: Map, x: number, y: number) {
			this.planet = planet;
			this.real_x = Math.round(x);
			this.real_y = Math.round(y);

			var chunkX = Math.floor(this.real_x / this.planet.worldSettings.chunkSize);
			var chunkY = Math.floor(this.real_y / this.planet.worldSettings.chunkSize);
			this.x = this.real_x % this.planet.worldSettings.chunkSize;
			this.y = this.real_y % this.planet.worldSettings.chunkSize;

			if (this.x < 0) {
				this.x = this.x + this.planet.worldSettings.chunkSize;
				chunkX--;
			}

			if (this.y < 0) {
				this.y = this.y + this.planet.worldSettings.chunkSize;
				chunkY--;
			}
			this.chunkX = chunkX;
			this.chunkY = chunkY;

			this.chunk = this.planet.chunkMap[chunkX + ":" + chunkY];

			if (!planet || !planet.chunkMap) {
				console.log('invalid call to PlanetLoc');
				console.log(new Error()
					.stack);
				console.log(this.toString());
				return;
			}
			if (!this.chunk) {
				console.log("tile on not loaded chunk: " + this.real_x + "," + this.real_y);
				console.log('chunk hash: ' + chunkX + ":" + chunkY);
				return;
			}

			if (this.x < 0 || this.x > this.planet.worldSettings.chunkSize ||
			this.y < 0 || this.y > this.planet.worldSettings.chunkSize) {
				console.log("invalid tile: " + this.real_x + "," + this.real_y);
				console.log("local coords: " + this.x + "," + this.y);
				console.log('chunk hash: ' + chunkX + ":" + chunkY);
			}

			window.debug.chunk = this.chunk;

			this.corners = [
				this.chunk.grid[this.y][this.x],
				this.chunk.grid[this.y + 1][this.x],
				this.chunk.grid[this.y][this.x + 1],
				this.chunk.grid[this.y + 1][this.x + 1]
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
				switch(this.chunk.navGrid[this.x][this.y]) {
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

	distance(tile){
		var deltaX = Math.abs(this.real_x - tile.real_x);
		var deltaY = Math.abs(this.real_y - tile.real_y);

		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

		/**
		 * @return {THREE.Vector3} Get the real location in the world
		 */
	getLoc(): THREE.Vector3 {
			return new THREE.Vector3(this.real_x, this.real_z, this.real_y);
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

	getVec(): THREE.vector3 {
		return new THREE.Vector3(this.real_x, this.real_z, this.real_y);
	}

	/**
	 * Compare with another PlanetLoc for equality by value
	 * @param  {PlanetLoc} Location to compare to
	 * @return {boolean}   Equality
	 */
	equals(otherLoc: PlanetLoc): boolean {
		return (otherLoc.real_x == this.real_x &&
			otherLoc.real_y == this.real_y &&
			otherLoc.planet == this.planet);
	}
}
