/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

export async function sleep(time: number): Promise<void> {
	await new Promise((resolve: Function) => {
		setTimeout(resolve, time);
	});
}

export default {
	sleep
};
