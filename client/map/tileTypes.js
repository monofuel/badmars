/* @flow */
'use strict';

// monofuel
// 2-7-2016

export const TILE_LAND = Symbol();
export const TILE_CLIFF = Symbol();
export const TILE_WATER = Symbol();
export const TILE_COAST = Symbol();

/**
  * Translate TileType symbols to strings for debugging
  * @param  {symbol}  TileType
  * @return {string}  name of tile
  */
export function getTypeName(type: Symbol): string {
  switch(type) {
    case TILE_LAND:
      return 'land';
    case TILE_CLIFF:
      return 'cliff';
    case TILE_WATER:
      return 'water';
    case TILE_COAST:
      return 'coast';
    default:
      return 'unknown';
  }
}
