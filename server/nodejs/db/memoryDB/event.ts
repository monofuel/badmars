import * as DB from '../';
import * as _ from 'lodash';
import Context from '../../context';
import { WrappedError } from '../../logger';
import { startDBCall } from '../helper';
import { SyncEvent } from 'ts-events';
// import { Lock } from 'semaphore-async-await'
const hat = require('hat');

export default class Event implements DB.Event {
    private gameEvents: SyncEvent<DB.GameEvent>
    public async init(ctx: Context): Promise<void> {
        ctx.check('game.init');
        this.gameEvents = new SyncEvent<DB.GameEvent>();
    }

    async watch(ctx: Context, fn: DB.Handler<DB.GameEvent>): Promise<void> {
        ctx.check('watchEvent');
        const wrapper = async (e: DB.GameEvent) => {
            try {
                await fn(ctx, e);
            } catch (err) {
                if (err instanceof DB.StopWatchingError) {
                    this.gameEvents.detach(wrapper)
                } else {
                    throw new WrappedError(err, 'failed to send event');
                }
            }
        };
        this.gameEvents.attach(wrapper);
    }
    async sendChat(ctx: Context, user: string, text: string, channel: string): Promise<void> {
        const call = startDBCall(ctx, 'sendEvent');
        const e: DB.ChatEvent = {
            type: 'chat',
            uuid: hat(),
            user,
            channel,
            text,
            timestamp: new Date(),
        }

        this.gameEvents.post(e);
        await call.end();
    }
}