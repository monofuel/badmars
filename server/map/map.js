//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';


class Map {
	constructor(name) {
		this.name = name;
		this.water = 1;
		this.settings = {};
	}
	getChunk(hash) {
		//TODO get chunk from db
	}

}

module.exports = Map;
