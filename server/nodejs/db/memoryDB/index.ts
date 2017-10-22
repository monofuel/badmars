import * as DB from '../';
import Context from '../../util/context';
import { startDBCall } from '../helper';
import Session from './session';
import Planet from './planet';
import User from './user';
import Event from './event';

export default class MemoryDB implements DB.DB {
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

    async getPlanetDB(ctx: Context, name: string): Promise<DB.Planet> {
        if (this.planets[name]) {
            return this.planets[name];
        }
        const call = startDBCall(ctx, 'getPlanet');
        const planet = new Planet(name);
        await planet.init(ctx);
        await call.end();
        return planet;
    }

    async listPlanetNames(ctx: Context) {
        const call = startDBCall(ctx, 'listPlanetNames');
        const names = Object.keys(this.planets);
        await call.end();
        return names;
    }
}