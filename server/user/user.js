//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var hat = require('hat');

class User {
	constructor(userName,color) {
		this.name = userName;
        this.apiKey = hat();
		this.color = color;
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
