import { getLocationDetails } from './planetloc';
import { expectEqual } from '../util';

const chunkSize = 8;
describe('tiles', () => {
	it('stuff', () => {
		let details = getLocationDetails(0, 0, chunkSize);
		expectEqual(details, {
			x: 0,
			y: 0,
			chunkX: 0,
			chunkY: 0,
			localX: 0,
			localY: 0
		}, '0,0 |' + JSON.stringify(details));

		details = getLocationDetails(-1, -1, chunkSize);
		expectEqual(details, {
			x: -1,
			y: -1,
			chunkX: -1,
			chunkY: -1,
			localX: 7,
			localY: 7
		}, '-1,-1 |' + JSON.stringify(details));

		details = getLocationDetails(0, -1, chunkSize);
		expectEqual(details, {
			x: 0,
			y: -1,
			chunkX: 0,
			chunkY: -1,
			localX: 0,
			localY: 7
		}, '-1,-1 |' + JSON.stringify(details));

		details = getLocationDetails(-1, 0, chunkSize);
		expectEqual(details, {
			x: -1,
			y: 0,
			chunkX: -1,
			chunkY: 0,
			localX: 7,
			localY: 0
		}, '-1,-1 |' + JSON.stringify(details));

		details = getLocationDetails(150, -150, chunkSize);
		expectEqual(details, {
			x: 150,
			y: -150,
			chunkX: 18,
			chunkY: -19,
			localX: 6,
			localY: 2
		}, '150, -150 |' + JSON.stringify(details));

		details = getLocationDetails(-150, -150, chunkSize);
		expectEqual(details, {
			x: -150,
			y: -150,
			chunkX: -19,
			chunkY: -19,
			localX: 2,
			localY: 2
		}, '-150, -150 |' + JSON.stringify(details));

		details = getLocationDetails(-76, 39, 16);
		expectEqual(details, {
			x: -76,
			y: 39,
			chunkX: -5,
			chunkY: 2,
			localX: 4,
			localY: 7
		}, '-76, 39 |' + JSON.stringify(details));
	});
});
