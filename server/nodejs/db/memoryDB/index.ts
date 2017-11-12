import * as DB from '../';
import Context from '../../util/context';
import { startDBCall } from '../helper';
import Session from './session';
import Planet from './planet';
import User from './user';
import Event from './event';

class MemoryDB implements DB.DB {
    private planets: { [key: string]: DB.Planet };
    public event: Event;
    public session: Session;
    public user: User;

    async init(ctx: Context): Promise<void> {
        this.user = new User();
        this.user.init(ctx.create());

        this.event = new Event();
        this.event.init(ctx.create());

        this.session = new Session();
        this.session.init(ctx.create());
    }

    async createPlanet(ctx: Context, name: string): Promise<DB.Planet> {
        throw new Error("Method not implemented.");
        /*
        const call = startDBCall(ctx, 'getPlanet');
        const planet = new Planet(name);
        await planet.init(ctx);
        await call.end();
        return planet;
        */
    }

    getPlanetDB(ctx: Context, name: string): Promise<DB.Planet> {
        throw new Error("Method not implemented.");
    }
    removePlanet(ctx: Context, name: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async listPlanetNames(ctx: Context) {
        const call = startDBCall(ctx, 'listPlanetNames');
        const names = Object.keys(this.planets);
        await call.end();
        return names;
    }
}

const db = new MemoryDB();
export default db;
