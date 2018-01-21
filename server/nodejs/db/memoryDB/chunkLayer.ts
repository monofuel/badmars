import * as DB from '../';
import Context from '../../context';
import { startDBCall } from '../helper';
import GameChunkLayer from '../../map/chunkLayer';
import { DetailedError } from '../../logger/index';

export default class ChunkLayer implements DB.DBChunkLayer {
    private chunksLayers: { [key: string]: GameChunkLayer } = {};

    public async init(ctx: Context): Promise<void> {
        ctx.check('chunkLayer.init');
    }
    async create(ctx: Context, layer: GameChunkLayer): Promise<GameChunkLayer> {
        const call = startDBCall(ctx, 'chunkLayer.create');
        this.chunksLayers[layer.hash] = layer;
        await call.end();
        return layer;
    }
    findChunkForUnit(ctx: Context, uuid: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    each(ctx: Context, fn: DB.Handler<GameChunkLayer>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async get(ctx: Context, hash: string): Promise<GameChunkLayer> {
        return this.chunksLayers[hash];
    }
    async setEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer> {
        const chunk = this.chunksLayers[hash];
        if (!chunk) {
            throw new DetailedError('chunk not found for setEntity', { hash, layer, uuid, tileHash });
        }
        let entityMap: EntityMapType;
        switch (layer) {
            case 'air':
                entityMap = chunk.air;
                break;
            case 'ground':
                entityMap = chunk.ground;
                break;
            case 'resource':
                entityMap = chunk.resource;
                break;
            default:
                throw new Error('invalid layer');
        }
        entityMap[tileHash] = uuid;
        return chunk;
    }

    async clearEntity(ctx: Context, hash: string, layer: string, uuid: string, tileHash: string): Promise<GameChunkLayer> {
        const chunk = this.chunksLayers[hash];
        if (!chunk) {
            throw new DetailedError('chunk not found for clearEntity', { hash, layer, uuid, tileHash });
        }
        let entityMap: EntityMapType;
        switch (layer) {
            case 'air':
                entityMap = chunk.air;
                break;
            case 'ground':
                entityMap = chunk.ground;
                break;
            case 'resource':
                entityMap = chunk.resource;
                break;
            default:
                throw new Error('invalid layer');
        }
        if (entityMap[tileHash] === uuid) {
            delete entityMap[tileHash];
        } else {
            throw new Error('invalid uuid at loc for clearEntity');
        }
        return chunk;
    }
}