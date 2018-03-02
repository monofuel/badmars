
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

// tileTypes and tileCodes are consistent between frontend and backend

type TileCode = 0 | 1 | 2 | 3;
type TileType = 'land' | 'cliff' | 'water' | 'coast' | 'unknown';

export const LAND: TileCode = 0;
export const CLIFF: TileCode = 1;
export const WATER: TileCode = 2;
export const COAST: TileCode = 3;

export function getTypeName(type: TileCode): TileType {
  switch (type) {
    case LAND:
      return 'land';
    case CLIFF:
      return 'cliff';
    case WATER:
      return 'water';
    case COAST:
      return 'coast';
    default:
      return 'unknown';
  }
}

export default {
  LAND,
  CLIFF,
  WATER,
  COAST,
  getTypeName,
};
