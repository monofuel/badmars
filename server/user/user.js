//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var hat = require('hat');
const _ = require('lodash');

class User {
	constructor(userName,color) {
		this.name = userName;
		//uuid is set by DB
        this.apiKey = hat();
		this.color = color;
	}

	save() {
		return db.user.saveUser(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = _.cloneDeep(object[key]);
		}
	}

}

module.exports = User;
