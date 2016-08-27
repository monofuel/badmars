/* @flow */

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
