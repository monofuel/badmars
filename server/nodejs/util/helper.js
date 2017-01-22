/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

export async function sleep(time: number) {
	await new Promise((resolve) => {
		setTimeout(resolve, time);
	});
}

export default {
	sleep
};
