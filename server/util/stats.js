//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var env = require('../config/env.js');
var logger = require('./logger.js');

var avgStats = {};
var sumStats = {};

exports.init = () => {
	setInterval(reportStats, env.statReportRate * 60 * 1000);
};

exports.addAverageStat = (key, value) => {
	if (!avgStats[key]) {
		avgStats[key] = [];
	}
	avgStats[key].push(value);
};

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
		stats[key] = avg;
	}
	avgStats = {};
	for (let key of Object.keys(sumStats)) {
		var array = sumStats[key];
		var avg = 0;
		for (let i of array) {
			avg += i;
		}
		stats[key] = avg;
	}
	sumStats = {};
	logger.info('stats',stats,false); //set to true after testing
};
