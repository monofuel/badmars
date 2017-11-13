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

    constructor(name: string) {
        this.name = name;
    }

    public async init(ctx: Context): Promise<void> {
        this.chunk = new Chunk();
        await this.chunk.init(ctx.create());

        this.chunkLayer = new ChunkLayer();
        await this.chunkLayer.init(ctx.create());

        this.unit = new Unit();
        await this.unit.init(ctx.create());

        this.unitStat = new UnitStat();
        await this.unitStat.init(ctx.create());

        this.factoryQueue = new FactoryQueue();
        await this.factoryQueue.init(ctx.create());

        this.planet = new GamePlanet(this.name);
    }

    public async patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void> {
        ctx.check('planet.patch');
        Object.assign(patch, this.planet);
    }
}