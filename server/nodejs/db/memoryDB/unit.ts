import * as _ from 'lodash';
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
    async each(ctx: Context, fn: DB.Handler<GameUnit>): Promise<void> {
        for (let uuid in this.units) {
            const unit = this.units[uuid];
            await fn(ctx, unit);
        }
    }
    async get(ctx: Context, uuid: string): Promise<GameUnit> {
        return this.units[uuid];
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
    async patch(ctx: Context, uuid: string, unit: Partial<UnitPatch>): Promise<GameUnit> {
        const call = startDBCall(ctx, 'unit.patch');
        const prev = this.units[uuid];
        const next = _.merge({}, prev, unit);
        this.units[uuid] = next;
        this.unitChange.post({ next, prev });
        await call.end();
        return next;
    }
    async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<GameUnit>>): Promise<void> {
        DB.AttachChangeHandler(ctx, this.unitChange, fn);
    }
    async watchPathing(ctx: Context, fn: DB.Handler<GameUnit>): Promise<void> {
        DB.AttachChangeHandler(ctx, this.unitChange, async (ctx, { next: unit }) => {
            if (unit.movable && unit.movable.isPathing == false && unit.movable.path.length === 0) {
                await fn(ctx, unit)
            }
        });
    }
    getAtChunk(ctx: Context, hash: string): Promise<GameUnit[]> {
        throw new Error("Method not implemented.");
    }
    getUnprocessedPath(ctx: Context): Promise<GameUnit> {
        throw new Error("Method not implemented.");
    }
    async getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
        const uuids: string[] = [];

        for (let uuid in this.units) {
            const unit = this.units[uuid];
            if (unit.awake && unit.details.lastTick < tick) {
                uuids.push(uuid);
            }
        }
        return uuids;
    }
    async claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<GameUnit> {
        const unit = this.units[uuid];
        if (unit.details.lastTick < tick) {
            unit.details.lastTick = tick;
            return unit;
        }
        return null;
    }
    async pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        const unit = this.units[uuid];
        if (type === 'iron') {
            if (unit.storage.iron - amount < 0) {
                const transferred = unit.storage.iron;
                await this.patch(ctx, uuid, { storage: { iron: 0 } })
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { iron: unit.storage.iron - amount } })
                return amount;
            }
        } else if (type === 'fuel') {
            if (unit.storage.fuel - amount < 0) {
                const transferred = unit.storage.fuel;
                await this.patch(ctx, uuid, { storage: { iron: 0 } })
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { fuel: unit.storage.fuel - amount } })
                return amount;
            }
        }
    }
    async putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        const unit = this.units[uuid];
        if (type === 'iron') {
            if (unit.storage.iron + amount > unit.storage.maxIron) {
                const transferred = unit.storage.maxIron - unit.storage.iron;
                await this.patch(ctx, uuid, { storage: { iron: unit.storage.maxIron } })
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { iron: unit.storage.iron + amount } })
                return amount;
            }
        } else if (type === 'fuel') {
            if (unit.storage.fuel + amount > unit.storage.maxFuel) {
                const transferred = unit.storage.maxFuel - unit.storage.fuel;
                await this.patch(ctx, uuid, { storage: { fuel: unit.storage.maxFuel } })
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { fuel: unit.storage.fuel + amount } })
                return amount;
            }
        }
    }
    async count(): Promise<number> {
        return Object.keys(this.units).length;
    }
    countAwake(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    countUnprocessed(): Promise<number> {
        throw new Error("Method not implemented.");
    }
}