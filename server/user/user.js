//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');

class User {
	constructor(userName) {
		this.name = userName;
        this.apiKey = "";
	}

	save() {
		return db.user.saveUser(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = object[key];
		}
	}

}

module.exports = User;
