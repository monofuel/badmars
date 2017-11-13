import Context from '../context';
import GamePlanet from '../map/map';
import GameChunk from '../map/chunk';
import GameChunkLayer from '../map/chunkLayer';
import GameUser from '../user';
import GameUnit, { UnitPatch } from '../unit/unit';
import GameSession from '../user/session';
import GameUnitStat from '../unit/unitStat';
import { SyncEvent } from 'ts-events';
import { WrappedError } from '../logger';

export type Handler<T> = (ctx: Context, newT: T, oldT?: T) => Promise<void>;
export interface ChangeEvent<T> {
    next: T;
    prev?: T;
}

export function AttachChangeHandler<T>(ctx: Context, sync: SyncEvent<T>, fn: Handler<T>) {
    const wrapper = async (e: T) => {
        try {
            ctx.check('sync event');
            await fn(ctx, e);
        } catch (err) {
            if (err instanceof StopWatchingError) {
                sync.detach(wrapper)
            } else {
                throw new WrappedError(err, 'failed to handle change event');
            }
        }
    };
    sync.attach(wrapper);
}

export class StopWatchingError extends Error {
    constructor(msg: string) {
        super(msg);
        Error.captureStackTrace(this, StopWatchingError);
    }
}

export interface Chunk {
    each(ctx: Context, fn: Handler<GameChunk>): Promise<void>;
    get(ctx: Context, hash: string): Promise<GameChunk>;
    patch(ctx: Context, uuid: string, chunk: Partial<GameChunk>): Promise<GameChunk>;
    create(ctx: Context, chunk: GameChunk): Promise<GameChunk>;
}

export interface ChunkLayer {
    create(ctx: Context, layer: GameChunkLayer): Promise<GameChunkLayer>;
    findChunkForUnit(ctx: Context, uuid: string): Promise<string>;
    each(ctx: Context, fn: Handler<GameChunkLayer>): Promise<void>;
    get(ctx: Context, hash: string): Promise<GameChunkLayer>;
    setEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer>;
    clearEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer>;
}

export interface Unit {
    each(ctx: Context, fn: Handler<GameUnit>): Promise<void>;
    get(ctx: Context, uuid: string): Promise<GameUnit>;
    create(ctx: Context, unit: GameUnit): Promise<GameUnit>;
    getBulk(ctx: Context, uuids: string[]): Promise<{ [uuid: string]: GameUnit }>;
    delete(ctx: Context, uuid: string): Promise<void>;
    patch(ctx: Context, uuid: string, unit: Partial<UnitPatch>): Promise<GameUnit>;
    watch(ctx: Context, fn: Handler<GameUnit>): Promise<void>;
    watchPathing(ctx: Context, fn: Handler<GameUnit>): Promise<void>;
    getAtChunk(ctx: Context, hash: string): Promise<GameUnit[]>;
    getUnprocessedPath(ctx: Context): Promise<GameUnit>;
    getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]>;
    claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<GameUnit>;

    listPlayersUnits(ctx: Context, uuid: string): Promise<GameUnit[]>;

    pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number>;
    putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number>;

    count(): Promise<number>;
    countAwake(): Promise<number>;
    countUnprocessed(): Promise<number>;
}

export interface FactoryQueue {
    create(ctx: Context, order: FactoryOrder): Promise<void>;
    list(ctx: Context, factory: UUID): Promise<FactoryOrder[]>;
    pop(ctx: Context, factory: UUID): Promise<FactoryOrder>;
    delete(ctx: Context, uuid: UUID): Promise<void>;

}

export interface UnitStat {
    getAll(ctx: Context): Promise<GameUnitStat[]>;
    get(ctx: Context, type: string): Promise<GameUnitStat>;
    patch(ctx: Context, type: string, stats: Partial<GameUnitStat>): Promise<GameUnitStat>;
}

export interface Planet {
    chunk: Chunk;
    chunkLayer: ChunkLayer;
    unit: Unit;
    factoryQueue: FactoryQueue;
    unitStat: UnitStat;
    planet: GamePlanet;
    patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void>;
}

export interface User {
    list(ctx: Context): Promise<GameUser[]>;
    get(ctx: Context, uuid: string): Promise<GameUser>;
    getByName(ctx: Context, name: string): Promise<GameUser | null>
    watch(ctx: Context, fn: Handler<ChangeEvent<GameUser>>): Promise<void>;
    create(ctx: Context, user: GameUser): Promise<GameUser>;
    patch(ctx: Context, uuid: string, user: Partial<GameUser>): Promise<GameUser>;
    delete(ctx: Context, uuid: string): Promise<void>;
}

export type GameEvent = ChatEvent;

export interface ChatEvent {
    type: 'chat';
    uuid: string;
    user: string;
    channel: string;
    text: string;
    timestamp: Date;
}

export interface Event {
    sendChat(ctx: Context, user: string, text: string, channel: string): Promise<void>;
    watch(ctx: Context, fn: Handler<GameEvent>): Promise<void>;
}

export interface Session {
    createBearer(ctx: Context, uuid: string): Promise<GameSession>;
    getBearerUser(ctx: Context, token: string): Promise<GameUser | null>;
}

export interface DB {
    init(ctx: Context): Promise<void>;
    createPlanet(ctx: Context, name: string): Promise<Planet>;
    getPlanetDB(ctx: Context, name: string): Promise<Planet | null>;
    // TODO probably should have a .each instead of listPlanetNames
    listPlanetNames(ctx: Context): Promise<string[]>;
    removePlanet(ctx: Context, name: string): Promise<void>;
    user: User;
    event: Event;
    session: Session;
}

class DelegateDB implements DB {
    db: DB;
    setup(db: DB) {
        this.db = db;
    }
    init(ctx: Context) {
        return this.db.init(ctx);
    }

    createPlanet(ctx: Context, name: string): Promise<Planet> {
        return this.db.createPlanet(ctx, name);
    }
    getPlanetDB(ctx: Context, name: string): Promise<Planet | null> {
        return this.db.getPlanetDB(ctx, name);
    }
    listPlanetNames(ctx: Context): Promise<string[]> {
        return this.db.listPlanetNames(ctx);
    }
    removePlanet(ctx: Context, name: string): Promise<void> {
        return this.db.removePlanet(ctx, name);
    }

    get user() {
        return this.db.user;
    }
    get event() {
        return this.db.event;
    }
    get session() {
        return this.db.session;
    }

}

const delegate = new DelegateDB();

export function setupDB(db: DB) {
    delegate.setup(db);
}

export default delegate;