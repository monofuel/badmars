import * as DB from '../';
import Context from '../../context';
import { assert } from 'chai';
import User from './user';
import Planet from './planet';
import Session from './session';
import Event from './event';

// Run 2 databases together and validate they match
export class CheckingDB implements DB.DB {
  private planets: { [key: string]: DB.Planet } = {};

  private db1: DB.DB;
  private db2: DB.DB;
  // TODO implementations
  public user!: User;
  public event!: Event;
  public session!: Session;

  constructor(db1: DB.DB, db2: DB.DB) {
    this.db1 = db1;
    this.db2 = db2;
  }
  public async setupSchema(ctx: Context): Promise<void> {
    await this.db1.setupSchema(ctx);
    await this.db2.setupSchema(ctx);
  }
  public async init(ctx: Context): Promise<void> {
    await this.db1.init(ctx);
    await this.db2.init(ctx);

    this.user = new User(this.db1.user, this.db2.user);
    this.event = new Event(this.db1.event, this.db2.event);
    this.session = new Session(this.db1.session, this.db2.session);
  }
  public async stop(ctx: Context): Promise<void> {
    await this.db1.stop(ctx);
    await this.db2.stop(ctx);
  }
  public async createPlanet(ctx: Context, name: string, seed?: number): Promise<DB.Planet> {
    const p1 = await this.db1.createPlanet(ctx, name, seed);
    const p2 = await this.db2.createPlanet(ctx, name, seed);
    // TODO map is still a class and not an interface
    // assert.deepEqual(p1.planet, p2.planet);
    const planet = new Planet(p1, p2, name, seed);
    this.planets[name] = planet;
    return planet;
  }
  public async getPlanetDB(ctx: Context, name: string): Promise<DB.Planet> {
    return this.planets[name];
  }
  public async listPlanetNames(ctx: Context): Promise<string[]> {
    const list1 = await this.db1.listPlanetNames(ctx);
    const list2 = await this.db2.listPlanetNames(ctx);
    assert.deepEqual(list1, list2);
    return list1;
  }
  public async removePlanet(ctx: Context, name: string): Promise<void> {
    await this.db1.removePlanet(ctx, name);
    await this.db2.removePlanet(ctx, name);
    delete this.planets[name];
  }
}
