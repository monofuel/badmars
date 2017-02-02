/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

export function checkContext(ctx: Context, msg: string) {
	if(!ctx.cancelled) {
		return;
	}
	throw new Error('context cancelled: ' + msg);
}
