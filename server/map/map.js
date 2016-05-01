//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';


class Map {
	constructor(name) {
		this.name = name || "defaultName";
		this.water = 1;
		this.chunks = {};
		this.settings = {};
	}
	getChunk(hash) {
		return this.chunks[hash];
	}

}

module.exports = Map;
