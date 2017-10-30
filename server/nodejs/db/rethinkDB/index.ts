import * as DB from '../';
import Context from '../../util/context';
// import { startDBCall } from '../helper';

export default class RethinkDB implements DB.DB {
    // private planets: { [key: string]: DB.Planet };
    public event: any;
    public session: any;
    public user: any;

    async init(ctx: Context): Promise<void> {
        throw new Error('not implemented');
    }

    async createPlanet(ctx: Context, name: string): Promise<DB.Planet> {
        throw new Error('not implemented');
    }

    getPlanetDB(ctx: Context, name: string): Promise<DB.Planet> {
        throw new Error("Method not implemented.");
    }
    removePlanet(ctx: Context, name: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async listPlanetNames(ctx: Context): Promise<string[]> {
        throw new Error('not implemented');
    }

    public async setupSchema(): Promise<void> {
        throw new Error('not implemented');
    }
}