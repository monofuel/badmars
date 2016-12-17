/* @flow */

import {Unit} from '../server/unit/unit.js';

type UUID = string;
type TileHash = string;
type ChunkHash = string;
type Timestamp = number;
type Tick = number;
type UnitType = string;

type Success = boolean;

type ChunkProto = {
  grid: Array<Object>;
  navGrid: Array<Object>;
}

type UnitMap = {
  [key: UUID]: Unit
}


declare interface Init {
  init(): Promise<void>;
}

declare interface MonoDoc {
  validateSync(): boolean;
  validateAsync(): Promise<boolean>;
  refresh(): Promise<void>;
}

declare interface Entity extends MonoDoc {
  clone(): Entity;
}
