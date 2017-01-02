/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
type statMap = {
	[key: string]: Array<number>
}

let avgStats: statMap = {};
let sumStats: statMap = {};

type Profile = {
	name: string,
	key: ProfileKey,
	startTime: number,
	endTime ? : number,
	delta ? : number
}

var runningProfiles: {
	[key: ProfileKey]: Profile
} = {};
var profileCount: {
	[key: string]: number
} = {};

exports.init = () => {
	setInterval(reportStats, env.statReportRate * 60 * 1000);
};

exports.startProfile = (name: string): ProfileKey => {
	let key: ProfileKey = name + Math.random();
	runningProfiles[key] = {
		name: name,
		key: key,
		startTime: (new Date()).getTime()
	};

	return key;
}
exports.endProfile = (key: ProfileKey) => {

	let profileRun: Profile = runningProfiles[key];
	let name: string = profileRun.name;
	profileRun.endTime = (new Date()).getTime();
	profileRun.delta = profileRun.endTime - profileRun.startTime;
	addAverageStat(profileRun.name, profileRun.delta);

	if(!profileCount[name]) {
		profileCount[name] = 1;
	} else {
		profileCount[name]++;
	}
}

function addAverageStat(key: string, value: number) {
	if(!avgStats[key]) {
		avgStats[key] = [];
	}
	avgStats[key].push(value);
};


exports.addAverageStat = addAverageStat;

exports.addSumStat = (key: string, value: number) => {
	if(!sumStats[key]) {
		sumStats[key] = [];
	}
	sumStats[key].push(value);
};


function reportStats() {
	const logger = require('./logger'); // cyclical dependency issue
	const stats: Object = {};
	for(let key: string of Object.keys(avgStats)) {
		const array: Array<number> = avgStats[key];
		let avg: number = 0;
		for(let i of array) {
			avg += i;
		}
		avg /= array.length;
		stats['avg-' + key] = avg;
	}
	avgStats = {};
	for(let key: string of Object.keys(sumStats)) {
		const array: Array<number> = sumStats[key];
		let avg: number = 0;
		for(let i of array) {
			avg += i;
		}
		stats['sum-' + key] = avg;
	}
	sumStats = {};

	for(let key: string of Object.keys(profileCount)) {
		stats['executions-' + key] = profileCount[key];
	}
	profileCount = {};

	logger.info('stats', stats, true);
};
