
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const hat = require('hat');
import * as _ from 'lodash';
import { checkContext } from '../util/logger';
import Context from '../util/context';

type TileHash = string;

export default class User {
	uuid: string; //filled by database
	name: string;
	color: string;
	apiKey: string;
	email: string;

	location: TileHash;
	password: Buffer; // pbkdf2 byte array

	constructor(username: string = '', color: string = '') {
		if (!username || !color) {
			return; // load from DB
		}
		this.name = username;
		//uuid is set by DB
		this.apiKey = hat();
		this.color = color;
	}
	clone(other: any) {
		for (const key in other) {
			(this as any)[key] = _.cloneDeep(other[key]);
		}
	}

	async update(ctx: Context, patch: Object): Promise<void> {
		checkContext(ctx, 'user update');
		Object.assign(this, patch);
		await ctx.db.user.patch(ctx, this.uuid, patch);
	}
}