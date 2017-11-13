import logger from '../logger';
import * as DB from '../db';
import * as uuidv4 from 'uuid/v4';

interface ContextOpts {
	name?: string;
	timeout?: number;
	env?: any; // TODO Generic Type this (requires updating a lot)
}

type UUID = string;

export default class Context {
	private _env: any;

	public name: string;
	public uuid: UUID;
	public canceled: boolean = false
	private deadlineExceeded: boolean = false;
	public start: Date;
	public tick: number;
	public timeout: number;

	timeoutInterval: NodeJS.Timer;

	constructor(opts: ContextOpts = {}) {
		this.uuid = uuidv4();
		this.timeout = opts.timeout;
		this._env = opts.env;
		this.name = opts.name;
		this.start = new Date();
		if (opts.timeout) {
			this.timeoutInterval = setTimeout(() => {
				this.canceled = true;
				this.deadlineExceeded = true;
			}, opts.timeout * 1000);
		}
	}

	public create(opts: ContextOpts = {}): Context {
		return new Context({
			...opts,
			name: opts.name ? `${this.name}_${opts.name}` : this.name,
			timeout: this.timeout,
			env: {
				...this._env,
				...(opts.env || {}),
			},
		});
	}

	public get env() {
		if (!this._env) {
			throw new Error('Env not set in context');
		}
		return this._env;
	}

	public set env(env) {
		this._env = env;
	}

	public cancel() {
		this.canceled = true;
		clearTimeout(this.timeoutInterval);
	}

	public info(info: string, body: any = {}, opts: { silent?: boolean, req?: any } = {}) {
		logger.info(this, info, body, opts);
	}

	public trackError(err: Error) {
		logger.trackError(this, err);
	}

	public check(msg: string) {
		if (this.deadlineExceeded) {
			throw new Error('context deadline exceeded: ' + msg);
		}
		if (this.canceled) {
			throw new Error('context canceled: ' + msg);
		}
	}
}