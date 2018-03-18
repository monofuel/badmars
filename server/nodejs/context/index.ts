import logger from '../logger';
import * as DB from '../db';
import * as uuidv4 from 'uuid/v4';
import Map from '../map/map';

interface ContextOpts {
  name?: string;
  timeout?: number; // in milliseconds
  env?: any; // TODO Generic Type this (requires updating a lot)
}

type UUID = string;

export default class Context {
  private _env: any;

  public name!: string;
  public uuid: UUID;
  public canceled: boolean = false;
  public deadlineExceeded: boolean = false;
  public start: number;
  public tick!: number;
  public timeout!: number;

  public timeoutInterval!: NodeJS.Timer;

  constructor(opts: ContextOpts = {}) {
    this.uuid = uuidv4();
    if (opts.timeout) {
      this.timeout = opts.timeout;
    }
    this._env = opts.env;
    if (opts.name) {
      this.name = opts.name;
    }
    this.start = Date.now();
    if (opts.timeout) {
      this.timeoutInterval = setTimeout(() => {
        this.canceled = true;
        this.deadlineExceeded = true;
      }, opts.timeout);
    }
  }

  public create(opts: ContextOpts = {}): Context {

    const parentTimeout = this.timeout ? this.timeout - (Date.now() - this.start) : 0;
    return new Context({
      ...opts,
      name: opts.name ? `${this.name}_${opts.name}` : this.name,
      timeout: this.timeout && opts.timeout ? Math.min(opts.timeout, parentTimeout) : opts.timeout || this.timeout,
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
    // in standalone mode, the timeout may not have fired yet
    if (this.deadlineExceeded || Date.now() > this.start + this.timeout) {
      throw new Error('context deadline exceeded: ' + msg);
    }
    if (this.canceled) {
      throw new Error('context canceled: ' + msg);
    }
  }
}

export class PlanetContext extends Context {
  public planet: Map;
  public planetDB: DB.Planet;
  constructor(planetDB: DB.Planet, opts: ContextOpts = {}) {
    super(opts);
    this.planet = planetDB.planet;
    this.planetDB = planetDB;
  }
}
