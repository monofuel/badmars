/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import hat from 'hat';
import _ from 'lodash';

class User {
	name: string;
	color: string;
	apiKey: string;

	constructor(userName: ? string, color : ? string) {
		if(!username || !color) {
			return; // empty constructor for DB
		}
		this.name = userName;
		//uuid is set by DB
		this.apiKey = hat();
		this.color = color;
	}

	save() {
		return db.user.saveUser(this);
	}
	clone(object) {
		_.cloneDeep(this, object);
	}

}

module.exports = User;
