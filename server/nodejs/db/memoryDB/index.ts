import * as fs from 'fs';
import * as DB from '../';
import * as _ from 'lodash';
import * as path from 'path';
import Context from '../../context';
import { startDBCall } from '../helper';
import Session from './session';
import Planet from './planet';
import User from './user';
import Event from './event';
import logger from '../../logger';

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

        if (!ctx.env.ephemeral && fs.existsSync(ctx.env.memoryDBPath)) {
            logger.info(ctx, 'loading database file');
            const dbStr = fs.readFileSync(ctx.env.memoryDBPath).toString();
            const prevDB = JSON.parse(dbStr);

            for (let planetName in prevDB.planets) {
                const planet = new Planet(planetName);
                this.planets[planetName] = planet;
            }
            _.merge(this, prevDB);
            for (let planetName in prevDB.planets) {
                await (this.planets[planetName] as Planet).init(ctx, prevDB.planets[planetName]);
            }
        }
        if (!ctx.env.ephemeral) {
            setInterval(() => this.saveDB(ctx.create({ name: 'db_updater' })), 10000);
        }
    }

    private async saveDB(ctx: Context): Promise<void> {
        // logger.info(ctx, 'updating database file');
        const dbpath = path.dirname(ctx.env.memoryDBPath);
        if (!fs.existsSync(dbpath)) {
            fs.mkdirSync(path.dirname(ctx.env.memoryDBPath));
        }
        const copyDB = _.cloneDeep(this);
        const dbStr = JSON.stringify(copyDB);
        fs.writeFileSync(ctx.env.memoryDBPath, dbStr);
        // logger.info(ctx, 'saved');
    }

    public async stop(ctx: Context): Promise<void> {
        if (!ctx.env.ephemeral) {
            await this.saveDB(ctx);
        }
    }

    public async createPlanet(ctx: Context, name: string, seed?: number): Promise<DB.Planet> {
        const call = startDBCall(ctx, 'createPlanet');
        const planet = new Planet(name, seed);
        await planet.init(ctx);
        this.planets[name] = planet;
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
