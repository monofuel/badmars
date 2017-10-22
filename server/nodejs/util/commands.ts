
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const vorpal = require('vorpal')();

import Logger from '../util/logger';
import * as DB from '../db';
import Context from '../util/context';

export default class Commands {
	db: DB.DB;
	logger: Logger;
	constructor(db: DB.DB, logger: Logger) {
		this.logger = logger;
		this.db = db;
		this.registerCommands();
	}

	init() {
		if (process.argv.length > 2) {
			const commands = process.argv.slice(2, process.argv.length);
			console.log('handling command:', commands.join(' '));
			vorpal.exec(commands.join(' ')).then(process.exit);

		} else {
			vorpal.delimiter('badmars' + '$').show();
		}
	}

	makeCtx(timeout?: number): Context {
		return new Context({ timeout, db: this.db, logger: this.logger});
	}

	registerCommands() {
		const ctx = this.makeCtx();

		//==================================================================
		// map methods

		vorpal.command('listMaps', 'list all created maps')
			.action(async (): Promise<void> => {
				const names = await this.db.listPlanetNames(ctx);
				console.log(names);
			});

		vorpal.command('removeMap <name>', 'remove a specific map')
			.autocomplete({
				data: (): Promise<Array<string>> => {
					return this.db.listPlanetNames(ctx);
				}
			})
			.action( async (args: any): Promise<void> => {
				await this.db.removePlanet(ctx, args.name)
				console.log('success');
			});

		vorpal.command('createMap <name>', 'create a new random map')
			.action(async (args: any): Promise<void> => {
				await this.db.createPlanet(ctx, args.name);
				console.log('created map ' + args.name);
			});

		vorpal.command('unpause <name>', 'unpause a map')
			.action(async (args: any): Promise<void> => {
				const planet = (await this.db.getPlanetDB(ctx, args.name)).planet;
				await planet.setPaused(ctx, false);
			});

		vorpal.command('pause <name>', 'pause a map')
			.action(async (args: any): Promise<void> => {
				const planet = (await this.db.getPlanetDB(ctx, args.name)).planet;
				await planet.setPaused(ctx, true);
			});

		vorpal.command('advanceTick <name>', 'advance the tick on a map')
			.action(async (args: any): Promise<void> => {
				// TODO would be cool if this function watched for how long it took to simulate the next tick
				const planet = (await this.db.getPlanetDB(ctx, args.name)).planet;
				await planet.advanceTick(ctx);
			});
		//==================================================================
		// user methods

		vorpal.command('removeuser <name>', 'remove all accounts with a given name')
			.action((args: any): Promise<void> => {
				return this.db.user.delete(ctx, args.name);
			});

	}
}
