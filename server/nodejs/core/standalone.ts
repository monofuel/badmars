import { Service } from './';
import Context from '../context';
import Web from './web';

export default class StandaloneService implements Service {
    private parentCtx: Context;

    private web: Web;

    async init(ctx: Context): Promise<void> {
        this.parentCtx = ctx;
        this.web = new Web();
        await this.web.init(ctx.create({ name: 'web' }));
    }

    async start(): Promise<void> {
        this.parentCtx.info('starting standalone');
        await this.web.start();
    }

    async stop(): Promise<void> {
        this.parentCtx.info('stopping standalone');
        await this.web.stop();
    }
}