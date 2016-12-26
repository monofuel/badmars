/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import logger from '../util/logger';
import hat from 'hat';
import _ from 'lodash';

class User {
	name: string;
	color: string;
	apiKey: string;

	constructor(username: ? string, color : ? string) {
		if(!username || !color) {
			return logger.errorWithInfo('invalid new user', { username, color });
		}
		this.name = username;
		//uuid is set by DB
		this.apiKey = hat();
		this.color = color;
	}
	clone(object) {
		_.cloneDeep(this, object);
	}

}

module.exports = User;
