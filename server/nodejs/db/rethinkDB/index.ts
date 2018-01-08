import * as DB from '../';
import Context from '../../context';
import * as r from 'rethinkdb';
import Session from './session';
import Planet from './planet';
import User from './user';
import Event from './event';
import { WrappedError } from '../../logger';
import sleep from '../../util/sleep';
import logger from '../../logger';
import { createTable } from '../helper';
import { startDBCall } from '../helper';

class RethinkDB implements DB.DB {
    conn: r.Connection;
    private planets: { [key: string]: Planet } = {};
    public event: Event;
    public session: Session;
    public user: User;

    private async connect(ctx: Context): Promise<void> {
        const { env } = ctx;
        const options: {
            host: string,
            db: string,
            port?: number,
            user?: string,
            password?: string
        } =
            {
                host: env.dbHost,
                db: env.database,
            };
        if (env.dbPort) {
            options.port = env.dbPort;
        }
        if (env.dbUser) {
            options.user = env.dbUser;
        }
        if (env.dbPassword) {
            options.password = env.dbPassword;
        }
        for (let i = 0; i < 5; i++) {
            try {
                this.conn = await r.connect(options);
                break;
            } catch (err) {
                logger.trackError(null, new WrappedError(err, 'failed to connect to DB' + (i < 5 ? ', retrying in 5 seconds' : 'giving up')));
                await sleep(5000);
            }
        }
        this.user = new User();
        this.event = new Event();
        this.session = new Session();
    }

    // setupSchema needs to be ran at least once before init() for new databases
    // this is handled by the 'schema' container in the docker-compose setup
    async setupSchema(ctx: Context): Promise<void> {
        await this.connect(ctx);
        if ((await r.dbList().run(this.conn)).indexOf(ctx.env.database) == -1) {
            await r.dbCreate(ctx.env.database).run(this.conn);
        }
        await createTable(this.conn, 'planet', 'name');
        logger.info(ctx, 'setup rethinkdb schema');
        await this.user.setupSchema(ctx.create(), this.conn);
        await this.event.setupSchema(ctx.create(), this.conn);
        await this.session.setupSchema(ctx.create(), this.conn);
    }

    async init(ctx: Context): Promise<void> {
        // setupSchema may have already connected
        if (!this.conn) {
            await this.connect(ctx);
        }

        const names = await this.listPlanetNames(ctx);
        for (const planetName of names) {
            const planet = new Planet(planetName);
            this.planets[planetName] = planet;
            await planet.init(ctx);
        }

        await this.user.init(ctx.create(), this.conn);
        await this.event.init(ctx.create(), this.conn);
        await this.session.init(ctx.create(), this.conn);
    }

    async stop(ctx: Context): Promise<void> {
        await this.conn.close();
    }

    async createPlanet(ctx: Context, name: string, seed?: number): Promise<DB.Planet> {
        const call = startDBCall(ctx, 'createPlanet');
        const planet = new Planet(name, seed);
        await planet.init(ctx);
        this.planets[name] = planet;
        await call.end();
        return planet;
    }

    async getPlanetDB(ctx: Context, name: string): Promise<DB.Planet> {
        throw new Error("Method not implemented.");
    }
    async removePlanet(ctx: Context, name: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async listPlanetNames(ctx: Context): Promise<string[]> {
        // HACK typescript doesn't think getField exists
        const cursor = await (r.table('planet') as any).getField('name').run(this.conn);
        const names = await cursor.toArray();
        return names;
    }
}
const db = new RethinkDB();
export default db;