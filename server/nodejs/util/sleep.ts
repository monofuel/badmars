
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

export default async function sleep(time: number): Promise<void> {
  await new Promise((resolve: () => void) => { setTimeout(resolve, time); });
}
