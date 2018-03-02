import * as DB from '../../db';
import * as uuid from 'uuid/v4';
import * as _ from 'lodash';
import Context from '../../context';
import { WrappedError } from '../../logger';
import { startDBCall } from '../../db/helper';
import { SyncEvent } from 'ts-events';

export default class Event implements DB.Event {
    private gameEvents: SyncEvent<DB.GameEvent>;
    public async init(ctx: Context): Promise<void> {
        ctx.check('event.init');
        this.gameEvents = new SyncEvent<DB.GameEvent>();
    }

    public async watch(ctx: Context, fn: DB.Handler<DB.GameEvent>): Promise<void> {
        ctx.check('event.watch');
        DB.AttachChangeHandler(ctx, this.gameEvents, fn);
    }
    public async sendChat(ctx: Context, user: string, text: string, channel: string): Promise<void> {
        ctx.check('event.sendChat');
        const call = startDBCall(ctx, 'sendEvent');
        const e: DB.ChatEvent = {
            type: 'chat',
            uuid: uuid(),
            user,
            channel,
            text,
            timestamp: new Date(),
        };

        this.gameEvents.post(e);
        await call.end();
    }
}
