
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import _ from 'lodash';

export default class Session {
	token: string;
	user: UUID;
	type: number;

	clone(other: Object) {
		for(const key in other) {
			// $FlowFixMe: hiding this issue for now
			this[key] = _.cloneDeep(other[key]);
		}
	}
}