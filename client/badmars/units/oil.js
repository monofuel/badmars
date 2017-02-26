/* @flow */
'use strict';

// monofuel
// 2-7-2016

import { PlanetLoc } from '../map/planetLoc.js';
import { Entity } from "./entity.js";
import { getMesh } from './unitModels.js';

export default class Oil extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uuid: string, scale: number) {
		super(location, uuid, 0x181818, 'oil', scale);
		this.rate = rate;
	}
}
