import { Service } from './';
import Context from '../util/context';

export default class StandaloneService implements Service {
    private parentCtx: Context;

    async init(ctx: Context): Promise<void> {
        this.parentCtx = ctx;
    }

    async start(): Promise<void> {
        this.parentCtx.info('starting standalone');
    }

    async stop(): Promise<void> {
        this.parentCtx.info('stopping standalone');
        throw new Error('not implemented');
    }

}