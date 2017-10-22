
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as os from 'os';
import * as _ from 'lodash';
import env from '../config/env';
import * as request from 'request';
import * as stats from './stats';
import Context from './context';

//==================================================================
// exported types

export type DetailsType = {
	[key: string]: any
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

function isDetailedError(err: any): err is DetailedError {
	return !!err.details;
} 

export class WrappedError extends DetailedError {
	constructor(err: Error | DetailedError, msg: string, details?: DetailsType) {
		super(msg, details);
		this.message = msg + ' caused by: ' + err.message;
		this.stack = err.stack;

		if (isDetailedError(err)) {
			this.details = Object.assign({}, err.details, details);
		}
		
	}
}

//==================================================================
// exported functions

export function checkContext(ctx: Context, msg: string) {
	if (!ctx) {
		throw new Error('missing context: ' + msg);
	}

	if (!ctx.db) {
		throw new Error('context missing db');
	}

	if (!ctx.canceled) {
		return;
	}
	throw new Error('context cancelled: ' + msg);
}

//==================================================================
// logger

export default class Logger {
	moduleName: string;
	// INFO: log things unless they want to be silent
	// DEBUG: always log everything, even silent
	// SILENT: alawys silent
	logLevel: 'INFO' | 'DEBUG' | 'SILENT';

	constructor(moduleName: string) {
		this.moduleName = moduleName;
		process.on('uncaughtException', (err: Error): void => this.unhandled(err));
		process.on('unhandledRejection', (err: Error): void => this.unhandled(err));
		this.logLevel = 'INFO';
	}

	clone(): Logger {
		const logger = new Logger(this.moduleName);
		logger.logLevel = this.logLevel;
		return logger;
	}

	unhandled(err: Error) {
		const wrapped = new WrappedError(err, 'unhandled error');
		this.trackError(null, wrapped);
	}

	info(ctx: Context, info: string, body: any = {}, opts: { silent?: boolean, req?: any } = {}) {
		body.timestamp = Date.now();
		this.track(ctx, info, body);
		if ((opts.silent && this.logLevel !== 'DEBUG') || this.logLevel === 'SILENT') {
			return;
		}
		const userText = opts.req && opts.req.user ? `USER|${opts.req.user.username}` : 'SYSTEM';
		console.log(`${this.moduleName}\t${userText}\tINFO\t${dateFormat(body.timestamp)}\t${info}`);
		if (Object.keys(body).length > 1) {
			console.log(JSON.stringify(body, null, 2));
		}
	}

	trackError(ctx: Context, err: Error | WrappedError | DetailedError) {
		const body: any = Object.assign({
			timestamp: (err as any).timestamp || Date.now(),
			stack: err.stack,
			message: err.message
		}, isDetailedError(err) ? err.details : {});
		console.error(`${this.moduleName}\tINFO\t${dateFormat(body.timestamp)}\t${body.message}`);
		console.error(body.stack);
		console.error(JSON.stringify(_.omit(body, ['stack']), null, 2));
		this.track(ctx, 'error', body);
	}

	track(ctx: Context, name: string, krgs: Object = {}) {
		
		const kargs: any = Object.assign({}, krgs);
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

		/*if (ctx && ctx.db) {
			ctx.db.event.create(ctx, kargs);
		}*/
		/*
		request({
			url: env.trackingServer + ':' + env.trackingPort + '/track/event',
			method: 'POST',
			body: JSON.stringify(kargs)
		}, (error: Error) => {
			if (error) {
				console.log(error);
			}
		});*/
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

function verifyTrack(name: string, kargs: any) {
	for (const key in kargs) {
		if (typeof kargs[key] == 'object') {
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
		}
	}
}