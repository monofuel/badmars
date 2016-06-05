//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var request = require('request');
var os = require('os');
var env = require('../config/env.js');
var stats = require('./stats.js');
stats.init();

var moduleName = 'monolith';

exports.setModule = (name) => {
	moduleName = name;
};

process.on('uncaughtException', unhandled);
process.on('unhandledRejection', unhandled);

function unhandled() {
	console.log('uncaught error');
	console.error(err.stack);
	if (logger) {
		try {
			logger.error(err);
		} catch(err) {
			console.log('failed to track unhandled error');
		}
	}
	console.log('uncaught exception, bailing out');
  process.exit(1);
};

//==================================================================
// stat functions

exports.addAverageStat = stats.addAverageStat;
exports.addSumStat = stats.addSumStat;

//==================================================================
// logging methods

module.exports.error = (err) => {
	var timestamp = new Date();
	console.log(dateFormat(timestamp) + ' : ' + err.stack);
	track('error', {
		message: err.message,
		stack: err.stack
	});
};

module.exports.requestInfo = (info, req) => {
	var timestamp = new Date();
	req.user = req.user || {};
	track(info, {
		ip: req.ip,
		username: req.user.username
	});
	if (req.ip) {
		if (req.isAuthenticated && req.isAuthenticated()) {
			console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip + " USER: " + req.user.username);
		} else {
			console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip);
		}
	} else {
		console.log("INFO: " + dateFormat(timestamp) + ": " + info);
	}

};

module.exports.info = (info, body, silent) => {
	var timestamp = new Date();
	track(info,body);
	if (silent) {
		return;
	} else if (body) {
		console.log("INFO: " + dateFormat(timestamp) + ": " + info + " : " + JSON.stringify(body));
	} else {
		console.log("INFO: " + dateFormat(timestamp) + ": " + info);
	}
};

//==================================================================
// functions

function dateFormat(date) {
	return date.getMonth() + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
}

function verifyTrack(name, kargs) {
	for (let key in kargs) {
		if (typeof kargs[key] == 'object') {
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
			track('error', {
				msg: 'invalid element ' + key + ' on ' + name
			});
		}
	}
}


function track(name, kargs) {
	kargs = kargs || {};
	name = name.replace(/ /g,"_").replace(/:/g," ");
	kargs.name = "server_" + name;
	kargs.module = moduleName;
	kargs.hostname = os.hostname();
	kargs.env = env.envType;
	verifyTrack(name,kargs);

	request({
		url: 'http://' + env.trackingServer + ':' + env.trackingPort + '/track/event',
		method: 'POST',
		body: JSON.stringify(kargs)
	}, (error, response, body) => {
		if(error) {
			console.log(error);
		}
	});
}
