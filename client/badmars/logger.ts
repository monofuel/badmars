// monofuel

import axios from 'axios';
import config from './config';
import { SyncEvent } from 'ts-events';

interface MetaType {
	[key: string]: any;
}

export type LogLevelType = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

interface LogEvent {
	name: string;
	meta: MetaType;
	level: LogLevelType;
}

const LogChange = new SyncEvent<LogEvent>();

export function log(level: LogLevelType, name: string, meta: MetaType = {}) {
	LogChange.post({ name, meta, level })
}
export function logError(err: Error) {

	// for pretty sourcemapped errors
	console.error(err);
	const meta = {
		message: err.message,
		stack: err.stack
	}
	LogChange.post({ name: 'error', meta, level: 'error' })
}

// log everything info and below to andrelytics
LogChange.attach(async (event: LogEvent): Promise<void> => {
	if (numberForLevel(event.level) >= 3) {
		return;
	}
	const name = event.name.replace(/ /g, '_');
	const optional: any = {}
	// TODO add player name
	const kargs = {
		...event.meta,
		name: `badmars_client_v${config.version}_${name}`,
		...optional,
	}

	// await axios.post('http://japura.net:9001/track/event', kargs)
})

LogChange.attach(async (event: LogEvent): Promise<void> => {
	if (numberForLevel(event.level) > numberForLevel(config.logLevel)) {
		return;
	}
	if (event.meta && Object.keys(event.meta).length > 0) {
		console.log(`${new Date()} ${event.level} | ${event.name} | ${JSON.stringify(event.meta)}`);
	} else {
		console.log(`${new Date()} ${event.level} | ${event.name}`);
	}
});

function numberForLevel(level: LogLevelType): number {
	switch (level) {
		case 'error':
			return 0;
		case 'warn':
			return 1;
		case 'info':
			return 2;
		case 'verbose':
			return 3;
		case 'debug':
			return 4;
		case 'silly':
			return 5;
	}
}

window.onerror = (msg, url, line, col, error) => {
	const body = {
		msg: msg,
		url: url,
		line: line,
		col: col,
		stack: error.stack,
	}
	log('error', msg as any, body);
}
