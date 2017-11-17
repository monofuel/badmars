import * as DB from '../';
import Context from '../../context';
import { SyncEvent } from 'ts-events';
import { startDBCall } from '../helper';
import GameUnit, { UnitPatch } from '../../unit/unit';

export default class Unit implements DB.Unit {

    private unitChange: SyncEvent<DB.ChangeEvent<GameUnit>>;
    private units: { [uuid: string]: GameUnit } = {};

    public async init(ctx: Context): Promise<void> {
        ctx.check('unit.init');
        this.unitChange = new SyncEvent<DB.ChangeEvent<GameUnit>>();

    }
    async listPlayersUnits(ctx: Context, uuid: string): Promise<GameUnit[]> {
        const userUnits: GameUnit[] = [];
        for (const unit of Object.values(this.units)) {
            if (unit.details.owner === uuid) {
                userUnits.push(unit);
            }
        }
        return userUnits;
    }
    each(ctx: Context, fn: DB.Handler<GameUnit>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    get(ctx: Context, uuid: string): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    async create(ctx: Context, unit: GameUnit): Promise<GameUnit> {
        const call = startDBCall(ctx, 'unit.create');
        this.units[unit.uuid] = unit;
        this.unitChange.post({ next: unit });
        await call.end();
        return unit;
    }
    async getBulk(ctx: Context, uuids: UUID[]): Promise<{ [key: string]: GameUnit }> {
        const res: { [key: string]: GameUnit } = {};
        for (const uuid of uuids) {
            res[uuid] = this.units[uuid];
        }
        return res;
    }
    delete(ctx: Context, uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    patch(ctx: Context, uuid: string, GameUnit: Partial<UnitPatch>): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUnit>>): Promise<void> {
        DB.AttachChangeHandler(ctx, this.unitChange, fn);
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