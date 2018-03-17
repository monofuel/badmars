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
  private db1: DB.Planet;
  private db2: DB.Planet;

  public planet: GamePlanet;
  public name: string;

  public chunk: Chunk;
  public chunkLayer: ChunkLayer;
  public unit: Unit;
  public unitStat: UnitStat;
  public factoryQueue: FactoryQueue;

  constructor(db1: DB.Planet, db2: DB.Planet, name: string, seed?: number) {
    this.name = name;
    this.planet = new GamePlanet(name, seed);
    this.db1 = db1;
    this.db2 = db2;
  }
  public async patch(ctx: Context, patch: Partial<GamePlanet>): Promise<void> {
    await this.db1.patch(ctx, patch);
    await this.db2.patch(ctx, patch);
  }
  public async addUser(ctx: Context, uuid: string): Promise<void> {
    await this.db1.addUser(ctx, uuid);
    await this.db2.addUser(ctx, uuid);
  }
}
