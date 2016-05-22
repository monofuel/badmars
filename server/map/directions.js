//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

module.exports = {
    N: Symbol(),
    S: Symbol(),
    E: Symbol(),
    W: Symbol(),
    C: Symbol(),

    getTypeName(type) {
        switch(type) {
          case this.N:
            return 'N';
          case this.S:
            return 'S';
          case this.W:
            return 'W';
          case this.E:
            return 'E';
          case this.C:
            return 'C';
          default:
            return 'unknown';
	    }
	}
};
