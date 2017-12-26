// monofuel

export default async function sleep(time: number): Promise<void> {
	await new Promise((resolve: Function) => {
		setTimeout(resolve, time);
	});
}