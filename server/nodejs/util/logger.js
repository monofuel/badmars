/* @flow */
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import os from 'os';
import _ from 'lodash';
import env from '../config/env';
import request from 'request';
import stats from './stats';
import MonoContext from './monoContext';

//==================================================================
// exported types

export type DetailsType = {
	[key: string]: number | string | boolean
};

//==================================================================
// exported classes

export class DetailedError extends Error {
	details: DetailsType;
	constructor(msg: string, details: DetailsType = {}) {
		super(msg);
		this.details = details;
	}
}

export class WrappedError extends DetailedError {
	constructor(err: Error | DetailedError, msg: string, details?: DetailsType) {
		super(msg, details);
		this.message = msg + ' caused by: ' + err.message;
		this.stack = err.stack;

		const detailed: DetailedError = (err: any);
		if (detailed.details) {
			this.details = Object.assign({}, detailed.details ? detailed.details : {}, details);
		}
		
	}
}

//==================================================================
// exported functions

export function checkContext(ctx: MonoContext, msg: string) {
	if (!ctx) {
		throw new Error('missing context: ' + msg);
	}
	if (!ctx.cancelled) {
		return;
	}
	throw new Error('context cancelled: ' + msg);
}

//==================================================================
// logger

export default class Logger {
	moduleName: string;
	constructor(moduleName: string) {
		this.moduleName = moduleName;
		process.on('uncaughtException', (err: Error): void => this.unhandled(err));
		process.on('unhandledRejection', (err: Error): void => this.unhandled(err));
		stats.init(this);
	}

	unhandled(err: Error) {
		const wrapped = new WrappedError(err, 'unhandled error');
		this.trackError(null, wrapped);
	}

	info(ctx: ?MonoContext, info: string, body: Object = {}, opts: { silent?: boolean, req?: Object } = {}) {
		body.timestamp = Date.now();
		this.track(ctx, info, body);
		if (opts.silent) {
			return;
		}
		const userText = opts.req ? `USER|${opts.req.user.username}` : 'SYSTEM';
		console.log(`${this.moduleName}\t${userText}\tINFO\t${dateFormat(body.timestamp)}\t${info}`);
		if (Object.keys(body).length > 1) {
			console.log(JSON.stringify(body, null, 2));
		}
	}

	trackError(ctx: ?MonoContext, err: Error | WrappedError | DetailedError) {
		const detailed: DetailedError = (err: any);
		const body: any = Object.assign({
			timestamp: err.timestamp || Date.now(),
			stack: err.stack,
			message: err.message
		}, detailed.details);
		console.error(`${this.moduleName}\tINFO\t${dateFormat(body.timestamp)}\t${body.message}`);
		console.error(body.stack);
		console.error(JSON.stringify(_.omit(body, ['stack']), null, 2));
		this.track(ctx, 'error', body);
	}

	track(ctx: ?MonoContext, name: string, krgs: Object = {}) {
		
		const kargs = Object.assign({}, krgs);
		//delete null fields
		for (const key of Object.keys(kargs)) {
			if (kargs[key] == null) {
				delete kargs[key];
			}
		}
		
		name = name.replace(/ /g, '_').replace(/:/g, ' ');
		kargs.name = 'server_' + name;
		kargs.module = this.moduleName;
		kargs.hostname = os.hostname();
		kargs.env = env.envType;
		verifyTrack(name, kargs);

		if (ctx && ctx.db) {
			ctx.db.event.addEvent(kargs);
		}
		request({
			url: env.trackingServer + ':' + env.trackingPort + '/track/event',
			method: 'POST',
			body: JSON.stringify(kargs)
		}, (error: Error) => {
			if (error) {
				console.log(error);
			}
		});
	}

	addAverageStat = stats.addAverageStat;
	addSumStat = stats.addSumStat;
	startProfile = stats.startProfile;
	endProfile = stats.endProfile;
}

//==================================================================
// private functions

function dateFormat(dateTime: number): string {
	const date = new Date(dateTime);
	return date.getMonth() + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes();
}

function verifyTrack(name: string, kargs: Object) {
	for (const key in kargs) {
		if (typeof kargs[key] == 'object') {
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
		}
	}
}