import { Service } from '.';
import Context from '../context';
import Web from './web';
import Net from './net';
import Pathfind from './pathfinding';
import db, * as DB from '../db';
import logger from '../logger';
import User, { newUser } from '../user';
import Unit, { simulate } from '../unit/unit';

export default class StandaloneService implements Service {
    private parentCtx: Context;

    private web: Web;
    private net: Net;
    private sim: SimulateService;
    private pathfind: Pathfind;

    async init(ctx: Context): Promise<void> {
        this.parentCtx = ctx;
        this.web = new Web();
        await this.web.init(ctx.create({ name: 'web' }));

        this.net = new Net();
        await this.net.init(ctx.create({ name: 'net' }));

        this.sim = new SimulateService();
        await this.sim.init(ctx.create({ name: 'simulate' }));

        this.pathfind = new Pathfind();
        await this.pathfind.init(ctx.create({ name: 'pathfind' }));

        // generate the initial test planet
        const planets = await db.listPlanetNames(ctx);
        let testPlanet: DB.Planet;
        if (!planets.includes('testmap')) {
            logger.info(ctx, 'creating testmap');
            testPlanet = await db.createPlanet(ctx, 'testmap', 1234);
        } else {
            testPlanet = await db.getPlanetDB(ctx, 'testmap');
        }

        // force a few chunks to load
        logger.info(ctx, 'loading chunks');
        const genCtx = ctx.create({ timeout: 5000 });
        for (let i = -10; i < 10; i++) {
            for (let k = -10; k < 10; k++) {
                await testPlanet.planet.getChunk(genCtx, i, k);
            }
        }

        if (!await db.user.getByName(ctx, 'test')) {
            logger.info(ctx, 'creating test user');
            const user = await newUser(ctx, 'test', 'test@japura.net', 'foobar');
            await db.user.create(ctx, user);

            // Do evil things to memoryDB to setup the test environment
            (db.session as any).sessions['TEST_SESSION_ID'] = { user: user.uuid, token: 'TEST_SESSION_ID', type: 1 }

            logger.info(ctx, 'spawning test user on testmap');
            await testPlanet.planet.spawnUser(ctx, user);
        }

        logger.info(ctx, 'standalone init done');

        logger.info(ctx, 'to login as the test user, visit localhost:3002 and run this in the console: sessionStorage.setItem(\'session-token\', \'TEST_SESSION_ID\')')
    }

    async start(): Promise<void> {
        this.parentCtx.info('starting standalone');
        await this.web.start();
        await this.net.start();
        await this.sim.start();
        await this.pathfind.start();
    }

    async stop(): Promise<void> {
        this.parentCtx.info('stopping standalone');
        await this.pathfind.stop();
        await this.sim.stop();
        await this.web.stop();
        await this.net.stop();
    }
}


class SimulateService implements Service {
    private parentCtx: Context;

    private tickTimeout: NodeJS.Timer;

    async init(ctx: Context): Promise<void> {
        this.parentCtx = ctx;
    }
    async start(): Promise<void> {
        logger.info(this.parentCtx, 'starting simulation');
        // Don't return the promise, as this will be long-lived
        this.tick();

        const planets = await db.listPlanetNames(this.parentCtx);
    }
    async stop(): Promise<void> {
        clearTimeout(this.tickTimeout);
    }

    async tick() {
        try {
            const ctx = this.parentCtx.create({ name: "tick" });
            const desiredLength = 1000 / ctx.env.ticksPerSec;
            const tickStartTime = Date.now();

            const planets = await db.listPlanetNames(ctx);

            for (let planet of planets) {
                await this.simulate(ctx, planet);
            }

            const tickEndTime = Date.now();
            const tickLength = tickEndTime - tickStartTime;
            const delay = desiredLength - tickLength;
            // logger.info(ctx, 'tick proccessed', { delay });
            this.tickTimeout = setTimeout(() => this.tick(), delay > 0 ? delay : 0);
        } catch (err) {
            logger.info(this.parentCtx, 'tick failed');
            logger.trackError(this.parentCtx, err);
            process.exit(-1);
        }
    }
    async simulate(ctx: Context, planetName: string): Promise<void> {
        const planetDB = await db.getPlanetDB(ctx, planetName);
        const tick = planetDB.planet.lastTick + 1;
        const unitUUIDs = await planetDB.unit.getUnprocessedUnitUUIDs(ctx, tick);
        // logger.info(ctx, 'processing units', { planetName, count: unitUUIDs.length });

        for (let uuid of unitUUIDs) {
            const unit = await planetDB.unit.claimUnitTick(ctx, uuid, tick);
            if (unit) {
                try {
                    await simulate(ctx, unit);
                } catch (err) {
                    if (ctx.env.debug) {
                        throw err;
                    } else {
                        logger.trackError(ctx, err);
                    }
                }
            }
        }

        await planetDB.planet.advanceTick(ctx);
    }
}