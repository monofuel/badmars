/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const vorpal = require('vorpal')();
import db from '../db/db';

exports.init = () => {
	if(process.argv.length > 2) {
		const commands = process.argv.slice(2, process.argv.length);
		console.log('handling command:', commands.join(' '));
		vorpal.exec(commands.join(' ')).then(process.exit);

	} else {
		vorpal.delimiter('badmars'.red + '$').show();
	}
};

//==================================================================
// dev methods

const Unit = require('../unit/unit.js');

vorpal.command('test', 'does SOMETHING')
	.action(() => {
		//today it makes a unit
		const unit = new Unit('tank');
		db.units['testplanet'].addUnit(unit).then((delta: Unit) => {
			console.log(delta);
		});

	});

//==================================================================
// map methods

vorpal.command('listmaps', 'list all created maps')
	.action((): Promise<void> => {
		return db.map.listNames().then((names: Array<string>) => {
			console.log(names);
		});
	});

vorpal.command('removemap <name>', 'remove a specific map')
	.autocomplete({
		data: (): Promise<Array<string>> => {
			return db.map.listNames();
		}
	})
	.action((args: object): Promise<void> => {
		return db.map.removeMap(args.name).then(() => {
			console.log('success');
		});
	});

vorpal.command('createmap <name>', 'create a new random map')
	.action((args: object): Promise<void> => {
		return db.map.createRandomMap(args.name).then(() => {
			console.log('created map ' + args.name);
		});
	});


//==================================================================
// user methods
vorpal.command('createuser <name> [apikey]', 'create a user account with an api key')
	.action((args: object): Promise<void> => {
		return db.user.createUser(args.name, '0xffffff').then((result: object): Promise<void> => {
			if(result.inserted !== 1) {
				throw new Error('failed to create user');
			}
			if(args.apikey) {
				return db.user.updateUser(args.name, { apiKey: args.apikey });
			}
		}).then((result: object) => {
			console.log(result);
		});
	});

vorpal.command('removeuser <name>', 'remove all accounts with a given name')
	.action((args: object): Promise<void> => {
		return db.user.deleteUser(args.name);
	});
