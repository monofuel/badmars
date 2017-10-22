import * as DB from '../';
import Context from '../../util/context';
import { Lock } from 'semaphore-async-await';
import GameUnitStat from '../../unit/unitStat';

export default class UnitStat implements DB.UnitStat {

    public async init(ctx: Context): Promise<void> {
        
    }
    
    getAll(ctx: Context): Promise<GameUnitStat[]> {
        throw new Error("Method not implemented.");
    }
    get(type: string): Promise<GameUnitStat> {
        throw new Error("Method not implemented.");
    }
    patch(ctx: Context, type: string, stats: Partial<GameUnitStat>): Promise<GameUnitStat> {
        throw new Error("Method not implemented.");
    }
}