/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type Client from '../client';
import Context from 'node-context';
import type Map from '../../map/map';
import type User from '../../user/user';
import logger from '../../util/logger';

import GetPlayers from './getPlayers';
import GetUnits from './getUnits';
import GetMap from './getMap';
import GetChunk from './getChunk';
import CreateGhost from './createGhost';
import Spawn from './spawn';
import SetDestination from './setDestination';
import UnitStats from './unitStats';
import FactoryOrder from './factoryOrder';
import TransferResource from './transferResource';
import SendChat from './sendChat';

function mountUserHandlers(client: Client) {
	client.handlers['getPlayers'] = GetPlayers;
	client.handlers['getUnits'] = GetUnits;
	client.handlers['getMap'] = GetMap;
	client.handlers['getChunk'] = GetChunk;
	client.handlers['createGhost'] = CreateGhost;
	client.handlers['spawn'] = Spawn;
	client.handlers['setDestination'] = SetDestination;
	client.handlers['unitStats'] = UnitStats;
	client.handlers['factoryOrder'] = FactoryOrder;
	client.handlers['transferResource'] = TransferResource;
	client.handlers['sendChat'] = SendChat;

	client.registerUnitListener();
	client.registerEventHandler();
	client.registerChatHandler();

}


// TODO refactor this code to use await
export default async function auth(ctx: Context, client: Client, data: Object): Promise<void> {

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
		client.sendError('login', error.message);

	});


};

const db = require('../../db/db');
console.log('DB', db);