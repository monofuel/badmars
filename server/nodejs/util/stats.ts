//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import Logger from './logger';

type StatMapType = {
	[key: string]: Array<number>
};

let avgStats: StatMapType = {};
let sumStats: StatMapType = {};

type ProfileType = {
	name: string,
	key: ProfileKey,
	startTime: number,
	endTime ?: number,
	delta ?: number
};

test.foobar();

const runningProfiles: {
	[key: ProfileKey]: ProfileType
} = {};
let profileCount: {
	[key: string]: number
} = {};

exports.init = (logger: Logger) => {
	setInterval((): void => reportStats(logger), env.statReportRate * 60 * 1000);
};

exports.startProfile = (name: string): ProfileKey => {
	const key: ProfileKey = name + Math.random();
	runningProfiles[key] = {
		name: name,
		key: key,
		startTime: (new Date()).getTime()
	};

	return key;
};
exports.endProfile = (key: ProfileKey, visible?: boolean) => {

	const profileRun: ProfileType = runningProfiles[key];
	const name: string = profileRun.name;
	profileRun.endTime = (new Date()).getTime();
	profileRun.delta = profileRun.endTime - profileRun.startTime;
	addAverageStat(profileRun.name, profileRun.delta);
	if (visible) {
		// eslint-disable-next-line no-console
		console.log('profile: ', profileRun.name, '|', profileRun.delta);
	}

	if(!profileCount[name]) {
		profileCount[name] = 1;
	} else {
		profileCount[name]++;
	}
};

function addAverageStat(key: string, value: number) {
	if(!avgStats[key]) {
		avgStats[key] = [];
	}
	avgStats[key].push(value);
}


exports.addAverageStat = addAverageStat;

exports.addSumStat = (key: string, value: number) => {
	if(!sumStats[key]) {
		sumStats[key] = [];
	}
	sumStats[key].push(value);
};


function reportStats(logger: Logger) {
	const stats: Object = {};
	for(const key: string of Object.keys(avgStats)) {
		const array: Array<number> = avgStats[key];
		let avg: number = 0;
		for(const i of array) {
			avg += i;
		}
		avg /= array.length;
		stats['avg-' + key] = avg;
	}
	avgStats = {};
	for(const key: string of Object.keys(sumStats)) {
		const array: Array<number> = sumStats[key];
		let avg: number = 0;
		for(const i of array) {
			avg += i;
		}
		stats['sum-' + key] = avg;
	}
	sumStats = {};

	for(const key: string of Object.keys(profileCount)) {
		stats['executions-' + key] = profileCount[key];
	}
	profileCount = {};
	logger.info(null, 'stats', stats, { silent: true });
}
