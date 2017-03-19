/* @flow */
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


import _ from 'lodash';
import PlanetLoc, { getLocationDetails } from './planetloc';
import { assert } from 'chai';

console.log('testing planet loc');

const chunkSize = 8;
