
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import * as _ from 'lodash';
type UUID = string;

export default class Session {
	token: string;
	user: UUID;
	type: number;

	clone(other: any) {
		for(const key in other) {
			// $FlowFixMe: hiding this issue for now
			(this as any)[key] = _.cloneDeep(other[key]);
		}
	}
}