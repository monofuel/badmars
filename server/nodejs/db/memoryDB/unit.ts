import * as DB from '../';
import Context from '../../util/context';
import { Lock } from 'semaphore-async-await';
import GameUnit from '../../unit/unit';

export default class Unit implements DB.Unit {
    listPlayersUnits(ctx: Context, uuid: string): Promise<GameUnit[]> {
        throw new Error("Method not implemented.");
    }

    public async init(ctx: Context): Promise<void> {
        
    }
    
    each(ctx: Context, fn: DB.Handler<GameUnit>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    get(ctx: Context, uuid: string): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    create(ctx: Context, GameUnit: GameUnit): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    getBulk(ctx: Context, uuids: string[]): Promise<{ [uuid: string]: GameUnit; }> {
        throw new Error("Method not implemented.");
    }
    delete(ctx: Context, uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    patch(ctx: Context, uuid: string, GameUnit: Partial<GameUnit>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    watch(ctx: Context, fn: DB.Handler<GameUnit>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    watchPathing(ctx: Context, fn: DB.Handler<GameUnit>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getAtChunk(ctx: Context, hash: string): Promise<GameUnit[]> {
        throw new Error("Method not implemented.");
    }
    getUnprocessedPath(ctx: Context): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    count(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    countAwake(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    countUnprocessed(): Promise<number> {
        throw new Error("Method not implemented.");
    }
}