//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../context';
import logger from '../logger';
type StatMapType = {
	[key: string]: Array<number>
};

let avgStats: StatMapType = {};
let sumStats: StatMapType = {};

type ProfileKey = string;

type ProfileType = {
	name: string,
	key: ProfileKey,
	startTime: number,
	endTime?: number,
	delta?: number
};

const runningProfiles: {
	[key: string]: ProfileType
} = {};
let profileCount: {
	[key: string]: number
} = {};

export function init(ctx: Context) {
	// setInterval((): void => reportStats(ctx), ctx.env.statReportRate * 60 * 1000);
};

export function startProfile(name: string): ProfileKey {
	/*
	const key: ProfileKey = name + Math.random();
	runningProfiles[key] = {
		name: name,
		key: key,
		startTime: (new Date()).getTime()
	};

	return key;
	*/
	return '';
};
export function endProfile(key: ProfileKey, visible?: boolean) {
	/*
	const profileRun: ProfileType = runningProfiles[key];
	delete runningProfiles[key];
	const name: string = profileRun.name;
	profileRun.endTime = (new Date()).getTime();
	profileRun.delta = profileRun.endTime - profileRun.startTime;
	addAverageStat(profileRun.name, profileRun.delta);
	if (visible) {
		// eslint-disable-next-line no-console
		console.log('profile: ', profileRun.name, '|', profileRun.delta);
	}

	if (!profileCount[name]) {
		profileCount[name] = 1;
	} else {
		profileCount[name]++;
	}
	*/
};

export function addAverageStat(key: string, value: number) {
	/*
	if (!avgStats[key]) {
		avgStats[key] = [];
	}
	avgStats[key].push(value);
	*/
}

export function addSumStat(key: string, value: number) {
	/*
	if (!sumStats[key]) {
		sumStats[key] = [];
	}
	sumStats[key].push(value);
	*/
};


function reportStats(ctx: Context) {
	const stats: any = {};
	for (const key of Object.keys(avgStats)) {
		const array: Array<number> = avgStats[key];
		let avg: number = 0;
		for (const i of array) {
			avg += i;
		}
		avg /= array.length;
		stats['avg-' + key] = avg;
	}
	avgStats = {};
	for (const key of Object.keys(sumStats)) {
		const array: Array<number> = sumStats[key];
		let avg: number = 0;
		for (const i of array) {
			avg += i;
		}
		stats['sum-' + key] = avg;
	}
	sumStats = {};

	for (const key of Object.keys(profileCount)) {
		stats['executions-' + key] = profileCount[key];
	}
	profileCount = {};
	logger.info(ctx, 'stats', stats, { silent: true });
}
