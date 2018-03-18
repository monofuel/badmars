
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import * as _ from 'lodash';

import { DetailedError } from '../logger';
import env from '../config/env';
import { getTypeName } from './tiletypes';

import db from '../db';
import Context from '../context';
import Map from './map';
import ChunkLayer from './chunkLayer';
import User from '../user/index';

/**
 * Representation of a point on a planet
 */

export default class PlanetLoc {
  public x: number;
  public y: number;
  public map: Map;
  public hash: TileHash;
  public chunk: Chunk;
  public chunkLayer: ChunkLayer;
  public localX: number;
  public localY: number;
  public tileType: TileCode;

  // temp storage used by getNearestFreeTile
  // TODO these should not be here
  public prev: null | PlanetLoc = null;
  public realCost: number = 0;
  public cost: number = 0;

  constructor(
    map: Map, chunk: Chunk, chunkLayer: ChunkLayer,
    { x, y, localX, localY }: LocationDetailsType) {
    if (!map) {
      throw new DetailedError('planetloc missing map', { x, y });
    }
    if (!chunk) {
      throw new DetailedError('planetloc missing chunk', { x, y });
    }

    this.x = x;
    this.y = y;
    this.map = map;
    this.hash = x + ':' + y;
    this.chunk = chunk;
    this.chunkLayer = chunkLayer;

    this.localX = localX;
    this.localY = localY;

    this.tileType = this.chunk.navGrid[this.localX][this.localY] as any;
  }

  public distance(tile: PlanetLoc): number {
    const deltaX = Math.abs(this.x - tile.x);
    const deltaY = Math.abs(this.y - tile.y);

    return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
  }

  public async getUnits(ctx: Context): Promise<Unit[]> {
    const planetDB = await db.getPlanetDB(ctx, this.map.name);
    ctx.check('getUnits');
    const uuids = [
      ...Object.values(this.chunkLayer.ground),
      ...Object.values(this.chunkLayer.resource),
    ];
    const units = Object.values(await planetDB.unit.getBulk(ctx, uuids));
    return _.filter(
      units, (unit: Unit): boolean =>
        (unit.location.hash as any).includes(this.hash));
  }

  public async isOpen(ctx: Context): Promise<boolean> {
    const units = await this.getUnits(ctx);
    return units.length === 0;
  }

  public toString(): string {
    let line = 'x: ' + this.x;
    line += ', y: ' + this.y;
    line += ', type: ' + getTypeName(this.tileType);
    if (this.map) {
      line += ', map: ' + this.map.name;
    }
    return line;
  }
  public async N(ctx: Context): Promise<PlanetLoc> {
    return await this.map.getLoc(ctx, this.x, this.y + 1);
  }
  public async S(ctx: Context): Promise<PlanetLoc> {
    return await this.map.getLoc(ctx, this.x, this.y - 1);
  }
  public async E(ctx: Context): Promise<PlanetLoc> {
    return await this.map.getLoc(ctx, this.x + 1, this.y);
  }
  public async W(ctx: Context): Promise<PlanetLoc> {
    return await this.map.getLoc(ctx, this.x - 1, this.y);
  }

  public async getDirTile(ctx: Context, dir?: Dir): Promise<PlanetLoc> {
    switch (dir) {
      case 'N':
        return await this.N(ctx);
      case 'S':
        return await this.S(ctx);
      case 'E':
        return await this.E(ctx);
      case 'W':
        return await this.W(ctx);
      case 'C':
      default:
        return this;
    }
  }

  // Only works for adjacent tiles
  public async getDirToTile(ctx: Context, other: PlanetLoc): Promise<Dir> {
    if ((await this.E(ctx)).equals(other)) {
      return 'E';
    }
    if ((await this.W(ctx)).equals(other)) {
      return 'W';
    }
    if ((await this.N(ctx)).equals(other)) {
      return 'N';
    }
    if ((await this.S(ctx)).equals(other)) {
      return 'S';
    }

    return 'C';
  }

  public validate() {
    if (!env.debug) {
      return;
    }
    const invalid = (reason: string) => {
      throw new DetailedError('bad tile: ' + reason, {
        hash: this.hash,
        x: this.x,
        y: this.y,
        chunkX: this.chunk.x,
        chunkY: this.chunk.y,
        localX: this.localX,
        localY: this.localY,
      });
    };
    if (this.x == null) {
      invalid('bad x value:' + this.x);
    }
    if (this.y == null) {
      invalid('bad x value:' + this.y);
    }
    if (!this.map) {
      invalid('bad map');
    }
    if (!this.hash || this.hash.split(':').length !== 2) {
      invalid('bad hash: ' + this.hash);
    }
    if (!this.chunk) {
      invalid('bad chunk');
    }
    if (this.localX == null) {
      invalid('bad local x');
    }
    if (this.localY == null) {
      invalid('bad local y');
    }
    if (this.localY > this.chunk.navGrid[0].length) {
      invalid('bad local y');
    }
    if (this.localX > this.chunk.navGrid.length) {
      invalid('bad local x');
    }
    if (this.tileType == null) {
      invalid('bad tile type');
    }

    const realX = (this.chunk.chunkSize * this.chunk.x) + this.localX;
    const realY = (this.chunk.chunkSize * this.chunk.y) + this.localY;
    if (this.x !== realX) {
      invalid('x does not match up: ' + realX + ' != ' + this.x);
    }
    if (this.y !== realY) {
      invalid('y does not match up: ' + realY + ' != ' + this.y);
    }
  }

  public equals(otherLoc: PlanetLoc): boolean {
    if (!otherLoc || !otherLoc.map) {
      return false;
    }
    return (
      otherLoc.x === this.x && otherLoc.y === this.y &&
      otherLoc.map.name === this.map.name);
  }

  public async isVisible(ctx: Context, user: User): Promise<boolean> {
    ctx.check('PlanetLoc.isVisible()');
    // get units in the area
    const units = await this.map.getNearbyUnitsFromChunk(
      ctx, this.chunk.hash, ctx.env.maxVision / this.chunk.chunkSize);

    // check if they are within vision range of an owned vehicle
    const ownedUnits =
      _.filter(units, (unit: Unit) => unit.details.owner === user.uuid);

    for (const unit of ownedUnits) {
      // not using planetLoc.distance for performance reasons
      // should probably rethink how planetLoc.distance works
      const deltaX = Math.abs(this.x - unit.location.x);
      const deltaY = Math.abs(this.y - unit.location.y);
      const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
      if (distance < unit.details.vision) {
        return true;
      }
    }

    return false;
  }
}

interface LocationDetailsType {
  x: number;
  y: number;
  chunkX: number;
  chunkY: number;
  localX: number;
  localY: number;
}

export function getLocationDetails(
  x: number, y: number, chunkSize: number): LocationDetailsType {
  x = Math.floor(x);
  y = Math.floor(y);

  const chunkX = Math.floor(x / chunkSize);
  const chunkY = Math.floor(y / chunkSize);
  const localX = x - (chunkX * chunkSize);
  const localY = y - (chunkY * chunkSize);

  return {
    x, y, chunkX, chunkY, localX, localY,
  };
}
