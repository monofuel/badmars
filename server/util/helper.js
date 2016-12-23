/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

exports.sleep = async(time) => {
	await new Promise((resolve, reject) => {
		setTimeout(resolve, time);
	});
}
