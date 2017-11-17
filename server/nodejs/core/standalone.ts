import { Service } from '.';
import Context from '../context';
import Web from './web';
import Net from './net';
import db from '../db';
import logger from '../logger';
import User, { newUser } from '../user';

export default class StandaloneService implements Service {
    private parentCtx: Context;

    private web: Web;
    private net: Net;

    async init(ctx: Context): Promise<void> {
        this.parentCtx = ctx;
        this.web = new Web();
        await this.web.init(ctx.create({ name: 'web' }));

        this.net = new Net();
        await this.net.init(ctx.create({ name: 'net' }));

        // generate the initial test planet
        logger.info(ctx, 'creating testmap');
        const testPlanet = await db.createPlanet(ctx, 'testmap');

        // force a few chunks to load
        logger.info(ctx, 'loading chunks');
        const genCtx = ctx.create({ timeout: 5000 });
        for (let i = -10; i < 10; i++) {
            for (let k = -10; k < 10; k++) {
                await testPlanet.planet.getChunk(genCtx, i, k);
            }
        }

        logger.info(ctx, 'creating test user');
        const user = await newUser(ctx, 'test', 'test@japura.net', 'foobar');
        await db.user.create(ctx, user);

        // Do evil things to memoryDB to setup the test environment
        (db.session as any).sessions['TEST_SESSION_ID'] = { user: user.uuid, token: 'TEST_SESSION_ID', type: 1 }

        logger.info(ctx, 'spawning test user on testmap');
        await testPlanet.planet.spawnUser(ctx, user);

        logger.info(ctx, 'standalone init done');

        logger.info(ctx, 'to login as thh test user, visit localhost:3002 and run this in the console: sessionStorage.setItem(\'session-token\', \'TEST_SESSION_ID\')')
    }

    async start(): Promise<void> {
        this.parentCtx.info('starting standalone');
        await this.web.start();
        await this.net.start();
    }

    async stop(): Promise<void> {
        this.parentCtx.info('stopping standalone');
        await this.web.stop();
        await this.net.stop();
    }
}