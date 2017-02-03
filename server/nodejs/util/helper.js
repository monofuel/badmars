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

export function checkEmptyImport(obj: Object, name: string, file: string) {
	for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return;
    }
    if (typeof obj === "function") {
        return;
    }
    console.log('### bad import', name,'in', file);
}