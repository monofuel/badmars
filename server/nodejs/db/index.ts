import Context from '../context';
import GamePlanet from '../map/map';
import ChunkLayer from '../map/chunkLayer';
import GameUser from '../user';
import GameSession from '../user/session';
import UnitStat from '../unit/unitStat';
import { SyncEvent } from 'ts-events';
import { WrappedError } from '../logger';
import sleep from '../util/sleep';

export type Handler<T> = (ctx: Context, t: T) => Promise<void>;
export interface ChangeEvent<T> {
    next: T;
    prev?: T;
}

export function AttachChangeHandler<T>(ctx: Context, sync: SyncEvent<T>, fn: Handler<T>) {
    const wrapper = async (e: T) => {
        try {
            ctx.check('sync event');
            await sleep(0); // force this to be asyncronous
            await fn(ctx, e);
        } catch (err) {
            if (err instanceof StopWatchingError) {
                sync.detach(wrapper);
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

export interface DBChunk {
    each(ctx: Context, fn: Handler<Chunk>): Promise<void>;
    get(ctx: Context, hash: string): Promise<Chunk>;
    patch(ctx: Context, uuid: string, chunk: Partial<Chunk>): Promise<Chunk>;
    create(ctx: Context, chunk: Chunk): Promise<Chunk>;
}

export interface DBChunkLayer {
    create(ctx: Context, layer: ChunkLayer): Promise<ChunkLayer>;
    findChunkForUnit(ctx: Context, uuid: string): Promise<string>;
    each(ctx: Context, fn: Handler<ChunkLayer>): Promise<void>;
    get(ctx: Context, hash: string): Promise<ChunkLayer>;
    setEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<ChunkLayer>;
    clearEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<ChunkLayer>;
}

export interface DBUnit {
    each(ctx: Context, fn: Handler<Unit>): Promise<void>;
    get(ctx: Context, uuid: string): Promise<Unit>;
    create(ctx: Context, unit: Unit): Promise<Unit>;
    getBulk(ctx: Context, uuids: string[]): Promise<{ [uuid: string]: Unit }>;
    delete(ctx: Context, uuid: string): Promise<void>;
    patch(ctx: Context, uuid: string, unit: Partial<UnitPatch>): Promise<Unit>;
    watch(ctx: Context, fn: Handler<ChangeEvent<Unit>>): Promise<void>;
    watchPathing(ctx: Context, fn: Handler<Unit>): Promise<void>;
    getAtChunk(ctx: Context, hash: string): Promise<Unit[]>;
    getUnprocessedPath(ctx: Context): Promise<Unit>;
    getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]>;
    claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit | null>;

    listPlayersUnits(ctx: Context, uuid: string): Promise<Unit[]>;

    pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number>;
    putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number>;

    count(): Promise<number>;
    countAwake(): Promise<number>;
    countUnprocessed(): Promise<number>;
}

export interface FactoryQueue {
    create(ctx: Context, order: FactoryOrder): Promise<void>;
    list(ctx: Context, factory: UUID): Promise<FactoryOrder[]>;
    pop(ctx: Context, factory: UUID): Promise<FactoryOrder | null>;
    peek(ctx: Context, factory: UUID): Promise<FactoryOrder | null>;
    delete(ctx: Context, uuid: UUID): Promise<void>;

}

export interface DBUnitStat {
    getAll(ctx: Context): Promise<{ [key: string]: UnitStat }>;
    get(ctx: Context, type: string): Promise<UnitStat>;
    patch(ctx: Context, type: string, stats: Partial<UnitStat>): Promise<UnitStat>;
}

export interface Planet {
    chunk: DBChunk;
    chunkLayer: DBChunkLayer;
    unit: DBUnit;
    factoryQueue: FactoryQueue;
    unitStat: DBUnitStat;
    planet: GamePlanet;
    patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void>;
    addUser(ctx: Context, uuid: UUID): Promise<void>;
}

export interface User {
    list(ctx: Context): Promise<GameUser[]>;
    get(ctx: Context, uuid: string): Promise<GameUser>;
    getByName(ctx: Context, name: string): Promise<GameUser | null>;
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
    setupSchema(ctx: Context): Promise<void>;
    init(ctx: Context): Promise<void>;
    stop(ctx: Context): Promise<void>;
    createPlanet(ctx: Context, name: string, seed?: number): Promise<Planet>;
    getPlanetDB(ctx: Context, name: string): Promise<Planet | null>;
    // TODO probably should have a .each instead of listPlanetNames
    listPlanetNames(ctx: Context): Promise<string[]>;
    removePlanet(ctx: Context, name: string): Promise<void>;
    user: User;
    event: Event;
    session: Session;
}

class DelegateDB implements DB {
    public db: DB;
    public setup(db: DB) {
        this.db = db;
        (global as any).db = db;
    }
    public setupSchema(ctx: Context) {
        return this.db.setupSchema(ctx);
    }
    public init(ctx: Context) {
        return this.db.init(ctx);
    }
    public stop(ctx: Context) {
        return this.db.stop(ctx);
    }

    public createPlanet(ctx: Context, name: string, seed?: number): Promise<Planet> {
        return this.db.createPlanet(ctx, name, seed);
    }
    public getPlanetDB(ctx: Context, name: string): Promise<Planet | null> {
        return this.db.getPlanetDB(ctx, name);
    }
    public listPlanetNames(ctx: Context): Promise<string[]> {
        return this.db.listPlanetNames(ctx);
    }
    public removePlanet(ctx: Context, name: string): Promise<void> {
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
