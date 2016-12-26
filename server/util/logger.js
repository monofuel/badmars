/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import request from 'request';
import os from 'os';
import env from '../config/env';
import stats from './stats';
import db from '../db/db';
import Context from 'node-context';
stats.init();

let moduleName = 'monolith';

//list of modules to output logs for STDOUT
const DEBUG_MODULES = ['chunk', 'ai'];
console.log('=========================');
console.log('DEBUGGING MODULES:', DEBUG_MODULES);
console.log('=========================');

exports.setModule = (name: string) => {
	moduleName = name;
};

process.on('uncaughtException', unhandled);
process.on('unhandledRejection', unhandled);

function unhandled(err) {
	console.log('uncaught error');
	console.error(err.stack);
	try {
		exports.error(err);
	} catch(err) {
		console.log('failed to track unhandled error');
	}
	console.log('uncaught exception, bailing out');
	process.exit(1);
};

//==================================================================
// stat functions

exports.addAverageStat = stats.addAverageStat;
exports.addSumStat = stats.addSumStat;
exports.startProfile = stats.startProfile;
exports.endProfile = stats.endProfile;

//==================================================================
// logging methods

function handleError(err: Error) {
	var timestamp = new Date();
	console.log(dateFormat(timestamp) + ' : ' + err.stack);
	track('error', {
		message: err.message,
		stack: err.stack,
		timestamp: Date.now()
	});
};
module.exports.error = handleError;

//throw a generic error message, but log specific information for debugging
module.exports.errorWithInfo = (msg: string, details: Object) => {
	exports.info(msg, details);
	throw new Error(msg);
}

module.exports.requestInfo = (info, req) => {
	var timestamp = new Date();
	req.user = req.user || {};
	track(info, {
		ip: req.ip,
		username: req.user.username
	});
	if(req.ip) {
		if(req.isAuthenticated && req.isAuthenticated()) {
			console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip + " USER: " + req.user.username);
		} else {
			console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip);
		}
	} else {
		console.log("INFO: " + dateFormat(timestamp) + ": " + info);
	}

};

module.exports.info = (info, body, silent) => {
	let timestamp = new Date();
	body = body || {};
	body.timestamp = timestamp.getTime();
	track(info, body);
	if(silent) {
		return;
	} else if(!DEBUG_MODULES.includes(moduleName)) {
		return;
	} else if(body) {
		console.log("INFO:", dateFormat(timestamp), ":", info, ":", body, ":", moduleName);
	} else {
		console.log("INFO:", dateFormat(timestamp), ":", info, ":", body);
	}
};

//==================================================================
// functions

function checkContext(ctx: Context, msg: string) {
	if(!ctx.cancelled) {
		return;
	}
	throw new Error('context cancelled: ' + msg);
}
exports.checkContext = checkContext;

function dateFormat(date: Date) {
	return date.getMonth() + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
}

function verifyTrack(name: string, kargs: ? Object) {
	for(let key in kargs) {
		if(typeof kargs[key] == 'object') {
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
			track('error', {
				msg: 'invalid element ' + key + ' on ' + name
			});
		}
	}
}


function track(name: string, kargs: ? Object) {
	kargs = kargs || {};
	for(let key of Object.keys(kargs)) {
		if(kargs[key] == null) { //delete null fields
			delete kargs[key];
		}
	}
	name = name.replace(/ /g, "_").replace(/:/g, " ");
	kargs.name = "server_" + name;
	kargs.module = moduleName;
	kargs.hostname = os.hostname();
	kargs.env = env.envType;
	verifyTrack(name, kargs);

	db.event.addEvent(kargs);
	/*
	request({
		url: env.trackingServer + ':' + env.trackingPort + '/track/event',
		method: 'POST',
		body: JSON.stringify(kargs)
	}, (error, response, body) => {
		if(error) {
			console.log(error);
		}
	});*/
}
