
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


import { getLocationDetails } from './planetloc';
import { assert } from 'chai';

console.log('testing planet loc');

const chunkSize = 8;

let details = getLocationDetails(0, 0, chunkSize);
assert.deepEqual(details, {
	x: 0,
	y: 0,
	chunkX: 0,
	chunkY: 0,
	localX: 0,
	localY: 0
}, '0,0 |' + JSON.stringify(details));

details = getLocationDetails(-1, -1, chunkSize);
assert.deepEqual(details, {
	x: -1,
	y: -1,
	chunkX: -1,
	chunkY: -1,
	localX: 7,
	localY: 7
}, '-1,-1 |' + JSON.stringify(details));

details = getLocationDetails(0, -1, chunkSize);
assert.deepEqual(details, {
	x: 0,
	y: -1,
	chunkX: 0,
	chunkY: -1,
	localX: 0,
	localY: 7
}, '-1,-1 |' + JSON.stringify(details));

details = getLocationDetails(-1, 0, chunkSize);
assert.deepEqual(details, {
	x: -1,
	y: 0,
	chunkX: -1,
	chunkY: 0,
	localX: 7,
	localY: 0
}, '-1,-1 |' + JSON.stringify(details));

details = getLocationDetails(150, -150, chunkSize);
assert.deepEqual(details, {
	x: 150,
	y: -150,
	chunkX: 18,
	chunkY: -19,
	localX: 6,
	localY: 2
}, '150, -150 |' + JSON.stringify(details));

details = getLocationDetails(-150, -150, chunkSize);
assert.deepEqual(details, {
	x: -150,
	y: -150,
	chunkX: -19,
	chunkY: -19,
	localX: 2,
	localY: 2
}, '-150, -150 |' + JSON.stringify(details));

console.log('SUCCESS');