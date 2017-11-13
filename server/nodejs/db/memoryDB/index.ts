import * as DB from '../';
import Context from '../../context';
import { startDBCall } from '../helper';
import Session from './session';
import Planet from './planet';
import User from './user';
import Event from './event';

class MemoryDB implements DB.DB {
    private planets: { [key: string]: DB.Planet } = {};
    public event: Event;
    public session: Session;
    public user: User;

    public async init(ctx: Context): Promise<void> {
        this.user = new User();
        this.user.init(ctx.create());

        this.event = new Event();
        this.event.init(ctx.create());

        this.session = new Session();
        this.session.init(ctx.create());
    }

    public async createPlanet(ctx: Context, name: string): Promise<DB.Planet> {
        const call = startDBCall(ctx, 'createPlanet');
        const planet = new Planet(name);
        await planet.init(ctx);
        await call.end();
        return planet;
    }

    public async getPlanetDB(ctx: Context, name: string): Promise<DB.Planet | null> {
        const call = startDBCall(ctx, 'getPlanetDB');
        const existing = this.planets[name];
        await call.end();
        return existing;
    }
    public async removePlanet(ctx: Context, name: string): Promise<void> {
        delete this.planets[name];
    }

    public async listPlanetNames(ctx: Context) {
        const call = startDBCall(ctx, 'listPlanetNames');
        const names = Object.keys(this.planets);
        await call.end();
        return names;
    }
}

const db = new MemoryDB();
export default db;
