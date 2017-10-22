import * as DB from '../';
import Context from '../../util/context';
import GamePlanet from '../../map/map';

export default class Planet implements DB.Planet {

    public name: string;

    public chunk: DB.Chunk;
    public unit: DB.Unit;
    public unitStat: DB.UnitStat;

    constructor(name: string) {
        this.name = name;
    }

    public async init(ctx: Context): Promise<void> {

    }

    public async patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void> {

    }
}