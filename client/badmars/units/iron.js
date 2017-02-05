/* @flow */
'use strict';

// monofuel
// 2-7-2016

import { PlanetLoc } from '../map/planetLoc.js';
import { Entity } from "./entity.js";
import { getMesh } from './unitModels.js';

export default class Iron extends Entity {
	rate: number;
	constructor(location: PlanetLoc, rate: number, uuid: string) {
		super(location, uuid, 0xF8F8F8, 'iron');
		this.rate = rate;
	}
}
