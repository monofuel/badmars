import { Service, Env } from './';
import Context from '../util/context';

export default class StandaloneService implements Service {
    private parentCTX: Context;

    async init(ctx: Context): Promise<void> {
        this.parentCTX = ctx;
    }

    async start(): Promise<void> {
        this.parentCTX.info('starting standalone');
    }
    
    async stop(): Promise<void> {
        this.parentCTX.info('stopping standalone');
        throw new Error('not implemented');
    }

}