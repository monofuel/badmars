//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const vorpal = require('vorpal')();

import { Service } from '../core';
import Context from '../context';
import db from '../db';

export default class Commands implements Service {
	private parentCtx: Context;

	public async init(ctx: Context): Promise<void> {
		this.parentCtx = ctx;
		this.registerCommands();
	}

	async stop(): Promise<void> {
		this.parentCtx.info('stopping standalone');
		throw new Error('not implemented');
	}

	async start() {
		if (process.argv.length > 2) {
			const commands = process.argv.slice(2, process.argv.length);
			console.log('handling command:', commands.join(' '));
			vorpal.exec(commands.join(' ')).then(process.exit);

		} else {
			vorpal.delimiter('badmars' + '$').show();
		}
	}

	registerCommands() {
		const ctx = this.parentCtx.create();
		//==================================================================
		// map methods

		vorpal.command('listMaps', 'list all created maps')
			.action(async (): Promise<void> => {
				const names = await db.listPlanetNames(ctx);
				console.log(names);
			});

		vorpal.command('removeMap <name>', 'remove a specific map')
			.autocomplete({
				data: (): Promise<Array<string>> => {
					return db.listPlanetNames(ctx);
				}
			})
			.action(async (args: any): Promise<void> => {
				await db.removePlanet(ctx, args.name)
				console.log('success');
			});

		vorpal.command('createMap <name>', 'create a new random map')
			.action(async (args: any): Promise<void> => {
				await db.createPlanet(ctx, args.name);
				console.log('created map ' + args.name);
			});

		vorpal.command('unpause <name>', 'unpause a map')
			.action(async (args: any): Promise<void> => {
				const planetDB = await db.getPlanetDB(ctx, args.name);
				if (!planetDB) {
					throw new Error('could not find planet');
				}
				await planetDB.planet.setPaused(ctx, false);
			});

		vorpal.command('pause <name>', 'pause a map')
			.action(async (args: any): Promise<void> => {
				const planetDB = await db.getPlanetDB(ctx, args.name);
				if (!planetDB) {
					throw new Error('could not find planet');
				}
				await planetDB.planet.setPaused(ctx, true);
			});

		vorpal.command('advanceTick <name>', 'advance the tick on a map')
			.action(async (args: any): Promise<void> => {
				// TODO would be cool if this function watched for how long it took to simulate the next tick
				const planetDB = await db.getPlanetDB(ctx, args.name);
				if (!planetDB) {
					throw new Error('could not find planet');
				}
				await planetDB.planet.advanceTick(ctx);
			});
		//==================================================================
		// user methods

		vorpal.command('removeuser <name>', 'remove all accounts with a given name')
			.action((args: any): Promise<void> => {
				return db.user.delete(ctx, args.name);
			});

	}
}
