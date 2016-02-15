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

	/**
	 * @param  {Map}     The map this location is on
	 * @param  {Number}  The X coordinate
	 * @param  {Number}  The Y coordinate
	 */
	constructor(planet: Map, x: number, y: number) {
			this.planet = planet;
			this.x = Math.round(x);
			this.y = Math.round(y);

			if (!planet || !planet.grid) {
				console.log('invalid call to PlanetLoc');
				console.log(new Error()
					.stack);
				console.log(this.toString());
				return;
			}

			// loop around bottom
			if (this.x < 0) {
				this.x = (this.planet.worldSettings.size + this.x - 1) %
					(this.planet.worldSettings.size - 1);
			}
			// loop around the top
			if (this.x >= this.planet.worldSettings.size - 1) {
				this.x = this.x % (this.planet.worldSettings.size - 2);
			}
			// loop around the right
			if (this.y < 0) {
				this.y = (this.planet.worldSettings.size + this.y - 1) %
					(this.planet.worldSettings.size - 1);
			}
			// loop around the left
			if (this.y >= this.planet.worldSettings.size - 1) {
				this.y = this.y % (this.planet.worldSettings.size - 2);
			}

			if (this.x >= this.planet.grid[0].length - 1 || this.x < 0) {
				console.log(this.toString());
				console.log(new Error()
					.stack);
			}
			if (this.y >= this.planet.grid[0].length - 1 || this.y < 0) {
				console.log(this.toString());
				console.log(new Error()
					.stack);
			}

			var corners = [
				this.planet.grid[this.y][this.x],
				this.planet.grid[this.y + 1][this.x],
				this.planet.grid[this.y][this.x + 1],
				this.planet.grid[this.y + 1][this.x + 1]
			];

			var avg = (corners[0] +
				corners[1] +
				corners[2] +
				corners[3]) / 4;
			if (avg < this.planet.worldSettings.waterHeight) {
				this.real_z = this.planet.worldSettings.waterHeight;
			} else {
				this.real_z = avg;
			}
			this.tileType = this.planet.navGrid[this.x][this.y];
			this.real_x = this.x + 0.5;
			this.real_y = -(this.y + 0.5);

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
		var line = "x: " + this.x;
		line += ", y: " + this.y;
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
			return new PlanetLoc(this.planet, this.x - 1, this.y);
		}
		/**
		 * @return {PlanetLoc} Tile to the east
		 */
	E(): PlanetLoc {
			return new PlanetLoc(this.planet, this.x + 1, this.y);
		}
		/**
		 * @return {PlanetLoc} Tile to the south
		 */
	S(): PlanetLoc {
			return new PlanetLoc(this.planet, this.x, this.y - 1);
		}
		/**
		 * @return {PlanetLoc} Tile to the north
		 */
	N(): PlanetLoc {
		return new PlanetLoc(this.planet, this.x, this.y + 1);
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
		return (otherLoc.x == this.x &&
			otherLoc.y == this.y &&
			otherLoc.planet == this.planet);
	}
}
