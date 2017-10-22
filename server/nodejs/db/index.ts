import Context from '../util/context';
import GamePlanet from '../map/map';
import GameChunk from '../map/chunk';
import GameChunkLayer from '../map/chunkLayer';
import GameUser from '../user/user';
import GameUnit from '../unit/unit';
import GameUnitStat from '../unit/unitStat';

export type Handler<T> = (e: T) => Promise<void>;

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
    each(ctx: Context, fn: Handler<GameChunk>): Promise<void>;
    get(ctx: Context, hash: string, layer: string): Promise<GameChunkLayer>;
    setEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer>;
}

export interface Unit {
    each(ctx: Context, fn: Handler<GameUnit>): Promise<void>;
    get(ctx: Context, uuid: string): Promise<GameUnit>;
    create(ctx: Context, unit: GameUnit): Promise<GameUnit>;
    getBulk(ctx: Context, uuids: string[]): Promise<{ [uuid: string]: GameUnit }>;
    delete(ctx: Context, uuid: string): Promise<void>;
    patch(ctx: Context, uuid: string, unit: Partial<GameUnit>): Promise<void>;
    watch(ctx: Context, fn: Handler<GameUnit>): Promise<void>;
    watchPathing(ctx: Context, fn: Handler<GameUnit>): Promise<void>;
    getAtChunk(ctx: Context, hash: string): Promise<GameUnit[]>;
    getUnprocessedPath(ctx: Context): Promise<GameUnit>;
    getUnprocessedUnitUUIDs(ctx: Context, tick: number): Promise<string[]>;
    claimUnitTick(ctx: Context, uuid: string, tick: number): Promise<Unit>;

    pullResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number>;
    putResource(ctx: Context, type: string, amount: number, uuid: string): Promise<number>;

    count(): Promise<number>;
    countAwake(): Promise<number>;
    countUnprocessed(): Promise<number>;
}

export interface UnitStat {
    getAll(ctx: Context): Promise<GameUnitStat[]>;
    get(type: string): Promise<GameUnitStat>;
    patch(ctx: Context, type: string, stats: Partial<GameUnitStat>): Promise<GameUnitStat>;
}

export interface Planet {
    chunk: Chunk;
    unit: Unit;
    unitStat: UnitStat;
    patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void>;
}

export interface User {
    list(ctx: Context): Promise<GameUser[]>;
    get(ctx: Context, uuid: string): Promise<GameUser>;
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
    getBearerUser(ctx: Context, token: string): Promise<GameUser>;
}

export interface DB {
    init(ctx: Context): Promise<void>;
    getPlanet(ctx: Context, name: string): Promise<Planet>;
    listPlanetNames(ctx: Context): Promise<string[]>;
    user: User;
    event: Event;
    session: Session;
}