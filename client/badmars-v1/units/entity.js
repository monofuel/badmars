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

export class Entity {

	/**
	 * This method should be overrided by other classes.
	 * @param	{PlanetLoc}	location to check if this unit blocks it
	 * @return	{boolean> do we block it
	 */
	checkGroundTile(tile: PlanetLoc): boolean {
		return false;
	}
}
