/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import {db} from '../db/db';
import logger from '../util/logger';
import hat from 'hat';
import _ from 'lodash';

class User {
	uuid: string; //filled by database
	name: string;
	color: string;
	apiKey: string;

	constructor(username: ? string, color: ? string) {
		if(!username || !color) {
			return; // load from DB
		}
		this.name = username;
		//uuid is set by DB
		this.apiKey = hat();
		this.color = color;
	}
	clone(other: Object) {
		for(const key in other) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(other[key]);
		}
	}

}

module.exports = User;
