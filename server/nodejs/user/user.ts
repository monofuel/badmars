
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import hat from 'hat';
import _ from 'lodash';
import { checkContext } from '../util/logger';

class User {
	uuid: string; //filled by database
	name: string;
	color: string;
	apiKey: string;

	location: TileHash;

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

	async update(ctx: MonoContext, patch: Object): Promise<void> {
		checkContext(ctx, 'user update');
		Object.assign(this, patch);
		await ctx.db.user.updateUser(this.name, patch);
	}

}

module.exports = User;
