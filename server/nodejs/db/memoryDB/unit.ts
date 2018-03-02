import * as _ from 'lodash';
import * as DB from '../';
import Context from '../../context';
import { SyncEvent } from 'ts-events';
import { startDBCall } from '../helper';

export default class DBUnit implements DB.DBUnit {

    private unitChange: SyncEvent<DB.ChangeEvent<Unit>>;
    private units: { [uuid: string]: Unit } = {};

    public async init(ctx: Context): Promise<void> {
        ctx.check('unit.init');
        this.unitChange = new SyncEvent<DB.ChangeEvent<Unit>>();

    }
    public async listPlayersUnits(ctx: Context, uuid: string): Promise<Unit[]> {
        const userUnits: Unit[] = [];
        for (const unit of Object.values(this.units)) {
            if (unit.details.owner === uuid) {
                userUnits.push(unit);
            }
        }
        return userUnits;
    }
    public async each(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
        for (const uuid in this.units) {
            const unit = this.units[uuid];
            await fn(ctx, unit);
        }
    }
    public async get(ctx: Context, uuid: string): Promise<Unit> {
        return this.units[uuid];
    }
    public async create(ctx: Context, unit: Unit): Promise<Unit> {
        const call = startDBCall(ctx, 'unit.create');
        this.units[unit.uuid] = unit;
        this.unitChange.post({ next: unit });
        await call.end();
        return unit;
    }
    public async getBulk(ctx: Context, uuids: UUID[]): Promise<{ [key: string]: Unit }> {
        const res: { [key: string]: Unit } = {};
        for (const uuid of uuids) {
            res[uuid] = this.units[uuid];
        }
        return res;
    }
    public async delete(ctx: Context, uuid: string): Promise<void> {
        const unit = this.units[uuid];
        delete this.units[uuid];
        this.unitChange.post({ next: null, prev: unit });
    }
    public async patch(ctx: Context, uuid: string, unit: Partial<UnitPatch>): Promise<Unit> {
        const call = startDBCall(ctx, 'unit.patch');
        // TODO: is this really being used? would be nice to remove.
        const prev = _.cloneDeep(this.units[uuid]);
        const next = _.merge(this.units[uuid], unit);
        // HACK don't merge arrays
        if (unit.movable && unit.movable.path) {
            next.movable.path = unit.movable.path;
        }

        this.units[uuid] = next;
        this.unitChange.post({ next, prev });
        await call.end();
        return next;
    }
    public async watch(ctx: Context, fn: DB.Handler<DB.ChangeEvent<Unit>>): Promise<void> {
        DB.AttachChangeHandler(ctx, this.unitChange, fn);
    }
    public async watchPathing(ctx: Context, fn: DB.Handler<Unit>): Promise<void> {
        DB.AttachChangeHandler(ctx, this.unitChange, async (ctx, { next: unit }) => {
            if (unit && unit.movable &&
                unit.movable.destination &&
                unit.movable.isPathing === false &&
                unit.movable.path.length === 0) {
                await fn(ctx, unit);
            }
        });
    }
    public getAtChunk(ctx: Context, hash: string): Promise<Unit[]> {
        throw new Error('Method not implemented.');
    }
    public async getUnprocessedPath(ctx: Context): Promise<Unit> {
        for (const unit of Object.values(this.units)) {
            if (unit && unit.movable &&
                unit.movable.destination &&
                unit.movable.isPathing === false &&
                unit.movable.path.length === 0) {
                return unit;
            }
        }
    }
    public async getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]> {
        const uuids: string[] = [];

        for (const uuid in this.units) {
            const unit = this.units[uuid];
            if (unit.details.lastTick < tick) {
                uuids.push(uuid);
            }
        }
        return uuids;
    }
    public async claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit | null> {
        const unit = this.units[uuid];
        if (unit.details.lastTick < tick) {
            unit.details.lastTick = tick;
            return unit;
        }
        return null;
    }
    public async pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        const unit = this.units[uuid];
        if (type === 'iron') {
            if (unit.storage.iron - amount < 0) {
                const transferred = unit.storage.iron;
                await this.patch(ctx, uuid, { storage: { iron: 0 } });
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { iron: unit.storage.iron - amount } });
                return amount;
            }
        } else if (type === 'fuel') {
            if (unit.storage.fuel - amount < 0) {
                const transferred = unit.storage.fuel;
                await this.patch(ctx, uuid, { storage: { iron: 0 } });
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { fuel: unit.storage.fuel - amount } });
                return amount;
            }
        }
    }
    public async putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number> {
        const unit = this.units[uuid];
        if (type === 'iron') {
            if (unit.storage.iron + amount > unit.storage.maxIron) {
                const transferred = unit.storage.maxIron - unit.storage.iron;
                await this.patch(ctx, uuid, { storage: { iron: unit.storage.maxIron } });
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { iron: unit.storage.iron + amount } });
                return amount;
            }
        } else if (type === 'fuel') {
            if (unit.storage.fuel + amount > unit.storage.maxFuel) {
                const transferred = unit.storage.maxFuel - unit.storage.fuel;
                await this.patch(ctx, uuid, { storage: { fuel: unit.storage.maxFuel } });
                return transferred;
            } else {
                await this.patch(ctx, uuid, { storage: { fuel: unit.storage.fuel + amount } });
                return amount;
            }
        }
    }
    public async count(): Promise<number> {
        return Object.keys(this.units).length;
    }
    public countAwake(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    public countUnprocessed(): Promise<number> {
        throw new Error('Method not implemented.');
    }
}
