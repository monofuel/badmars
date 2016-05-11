//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

module.exports = {
    LAND: Symbol(),
    CLIFF: Symbol(),
    WATER: Symbol(),
    COAST: Symbol(),

    getTypeName(type) {
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
