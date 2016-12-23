/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import env from '../config/env';
import logger from './logger';

let avgStats = {};
let sumStats = {};

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
	let key = name + Math.random();
	runningProfiles[key] = {
		name: name,
		key: key,
		startTime: (new Date()).getTime()
	};

	return key;
}
exports.endProfile = (key: ProfileKey) => {

	let profileRun = runningProfiles[key];
	let name = profileRun.name;
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
	var stats = {};
	for(let key of Object.keys(avgStats)) {
		var array = avgStats[key];
		var avg = 0;
		for(let i of array) {
			avg += i;
		}
		avg /= array.length;
		stats['avg-' + key] = avg;
	}
	avgStats = {};
	for(let key of Object.keys(sumStats)) {
		var array = sumStats[key];
		var avg = 0;
		for(let i of array) {
			avg += i;
		}
		stats['sum-' + key] = avg;
	}
	sumStats = {};

	for(let key of Object.keys(profileCount)) {
		stats['executions-' + key] = profileCount[key];
	}
	profileCount = {};

	logger.info('stats', stats, true);
};
