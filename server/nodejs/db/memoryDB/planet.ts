import * as _ from 'lodash';
import * as DB from '../';
import Context from '../../context';
import GamePlanet from '../../map/map';
import Chunk from './chunk';
import ChunkLayer from './chunkLayer';
import Unit from './unit';
import UnitStat from './unitStat';
import FactoryQueue from './factoryQueue';

export default class Planet implements DB.Planet {
    planet: GamePlanet;
    public name: string;

    public chunk: Chunk;
    public chunkLayer: ChunkLayer;
    public unit: Unit;
    public unitStat: UnitStat;
    public factoryQueue: FactoryQueue;

    constructor(name: string, seed?: number) {
        this.name = name;
        this.planet = new GamePlanet(name, seed);
    }

    public async init(ctx: Context, prev: any = {}): Promise<void> {
        this.chunk = new Chunk();
        _.merge(this.chunk, prev.chunk);
        await this.chunk.init(ctx.create());

        this.chunkLayer = new ChunkLayer();
        _.merge(this.chunkLayer, prev.chunkLayer);
        await this.chunkLayer.init(ctx.create());

        this.unit = new Unit();
        _.merge(this.unit, prev.unit);
        await this.unit.init(ctx.create());

        this.unitStat = new UnitStat();
        _.merge(this.unitStat, prev.unitStat);
        await this.unitStat.init(ctx.create());

        this.factoryQueue = new FactoryQueue();
        _.merge(this.factoryQueue, prev.factoryQueue);
        await this.factoryQueue.init(ctx.create());
    }

    public async patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void> {
        ctx.check('planet.patch');
        Object.assign(patch, this.planet);
    }
}