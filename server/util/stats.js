//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');
var logger = require('./logger.js');

var avgStats = {};
var sumStats = {};

var runningProfiles = {};
var profileCount = {};

exports.init = () => {
	setInterval(reportStats, env.statReportRate * 60 * 1000);
};

exports.startProfile = (name) => {
	let key = name + Math.random();
	runningProfiles[key] = {
		name: name,
		key: key,
		startTime: (new Date()).getTime()
	};

	return key;
}
exports.endProfile = (key) => {

	let profileRun = runningProfiles[key];
	let name = profileRun.name;
	profileRun.endTime = (new Date()).getTime();
	profileRun.delta = profileRun.endTime - profileRun.startTime;
	addAverageStat(profileRun.name,profileRun.delta);

	if (!profileCount[name]) {
		profileCount[name] = 1;
	} else {
		profileCount[name]++;
	}
}

function addAverageStat(key, value) {
	if (!avgStats[key]) {
		avgStats[key] = [];
	}
	avgStats[key].push(value);
};


exports.addAverageStat = addAverageStat;

exports.addSumStat = (key, value) => {
	if (!sumStats[key]) {
		sumStats[key] = [];
	}
	sumStats[key].push(value);
};


function reportStats() {
	var stats = {};
	for (let key of Object.keys(avgStats)) {
		var array = avgStats[key];
		var avg = 0;
		for (let i of array) {
			avg += i;
		}
		avg /= array.length;
		stats['avg-' + key] = avg;
	}
	avgStats = {};
	for (let key of Object.keys(sumStats)) {
		var array = sumStats[key];
		var avg = 0;
		for (let i of array) {
			avg += i;
		}
		stats['sum-' + key] = avg;
	}
	sumStats = {};

	for (let key of Object.keys(profileCount)) {
		stats['executions-' + key] = profileCount[key];
	}
	profileCount = {};

	logger.info('stats',stats,true);
};
