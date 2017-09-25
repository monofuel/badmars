const Hat = require('hat');

import Logger from '../util/logger';
import DB from '../db/db';

interface ContextOpts {
	timeout?: number
}

type UUID = string;

export default class Context {
	public db: DB;
	public logger: Logger;
	public uuid: UUID;
	public canceled: boolean = false;
	public start: Date;
	public tick: number;
	public timeout: number;

	timeoutInterval: NodeJS.Timer;
	
	constructor(opts: ContextOpts = {}, db: DB, logger: Logger) {
		this.uuid = Hat();
		this.timeout = opts.timeout;
		this.db = db;
		this.logger = logger;
		this.start = new Date();

		this.timeoutInterval = setTimeout(() => {
			this.canceled = true;
		}, opts.timeout * 1000);

	}

	create(opts: ContextOpts = {}): Context {
		return new Context({ timeout: this.timeout, ...opts}, this.db, this.logger);
	}

	cancel() {
		this.canceled = true;
		clearTimeout(this.timeoutInterval);
	}
}