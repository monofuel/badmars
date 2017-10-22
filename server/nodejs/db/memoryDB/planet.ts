import * as DB from '../';
import Context from '../../util/context';
import GamePlanet from '../../map/map';
import Chunk from './chunk';
import ChunkLayer from './chunkLayer';
import Unit from './unit';
import UnitStat from './unitStat';

export default class Planet implements DB.Planet {

    public name: string;

    public chunk: Chunk;
    public chunkLayer: ChunkLayer;
    public unit: Unit;
    public unitStat: UnitStat;

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
    }

    public async patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void> {
        throw new Error("Method not implemented.");
    }
}