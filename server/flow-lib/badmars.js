/* @flow */

import {Unit} from '../unit/unit.js';

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
