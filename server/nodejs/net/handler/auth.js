/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from 'node-context';
import logger from '../../util/logger';
import { checkEmptyImport } from '../../util/helper';

checkEmptyImport(logger, 'logger', 'auth.js')
function mountUserHandlers(client: Client) {
	client.handlers['getPlayers'] = require('./getPlayers').default;
	client.handlers['getUnits'] = require('./getUnits').default;
	client.handlers['getMap'] = require('./getMap').default;
	client.handlers['getChunk'] = require('./getChunk').default;
	client.handlers['createGhost'] = require('./createGhost').default;
	client.handlers['spawn'] = require('./spawn').default;
	client.handlers['setDestination'] = require('./setDestination').default;
	client.handlers['unitStats'] = require('./unitStats').default;
	client.handlers['factoryOrder'] = require('./factoryOrder').default;
	client.handlers['transferResource'] = require("./transferResource").default;
	client.handlers['sendChat'] = require('./sendChat').default;

	client.registerUnitListener();
	client.registerEventHandler();
	client.registerChatHandler();

}


// TODO refactor this code to use await
export default async function auth(ctx: Context, client: Client, data: Object): Promise<void> {
	logger.checkContext(ctx, 'auth');

	if(!data.planet) { //TODO change from planet to map
		client.sendError('login', 'specify a planet');
	}
	if(!data.username) {
		client.sendError('login', 'invalid username');
	}
	return db.map.getMap(ctx,data.planet).then((planet: Map): Promise<User> => {
		if(!planet) {
			throw new Error('planet doesn\'t exist');
		}
		client.planet = planet; //TODO remove this when updated in other places
		client.map = planet;

		return db.user.getUser(data.username);
	}).then((user: User): Promise<void> => {
		if(user) {
			if(data.apiKey != user.apiKey) {
				throw new Error('invalid api key');
			}
			client.user = user;
			client.username = user.name;
			mountUserHandlers(client);

			client.send('login');
			return Promise.resolve();
		} else {

			//TODO
			//verify user against oath2
			if(!data.color) {
				throw new Error('no hex color specified');
			}
			// TODO createUser should return a User, not a database thing
			return db.user.createUser(data.username, data.color).then((result: Object) => {
				if(result.inserted == 1) {
					const user = result.changes[0].new_val;

					logger.info('account created', { name: user.name });
					client.user = user;
					client.username = user.name;
					mountUserHandlers(client);

					client.send('login', { apiKey: user.apiKey });
				} else {
					logger.errorWithInfo('registration failed', { result });
				}
			});
		}
	}).catch((error: Error) => {
		logger.info('auth error', {error});
		client.sendError('login', 'login failed');

	});


};

const Client = require('../client');
checkEmptyImport(Client, 'client', 'auth.js');
const Map = require('../../map/map');
checkEmptyImport(Map, 'map', 'auth.js');
const User = require('../../user/user');
checkEmptyImport(User, 'user', 'auth.js');

const db = require('../../db/db');
checkEmptyImport(db, 'db', 'auth.js');