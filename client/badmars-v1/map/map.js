/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {PlanetLoc} from './planetLoc.js';
import {TILE_LAND,TILE_WATER,TILE_CLIFF,TILE_COAST} from './tileTypes.js';






export class Map {
  settings: Settings;
  grid: Array<Array<number>>;
  navGrid: Array<Array<Symbol>>;

  landMeshes: Array<THREE.Object3D>;
  waterMeshes: Array<THREE.Object3D>;


  class Settings {
    size: number;
  }
}
