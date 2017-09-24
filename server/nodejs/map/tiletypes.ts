
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

// tileTypes and tileCodes are consistent between frontend and backend

export const LAND = 0;
export const CLIFF = 1;
export const WATER = 2;
export const COAST = 3;

export function getTypeName(type: TileCode): TileType {
	switch(type) {
	case this.LAND:
		return 'land';
	case this.CLIFF:
		return 'cliff';
	case this.WATER:
		return 'water';
	case this.COAST:
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
	getTypeName
};
