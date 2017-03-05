/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Client from '../client';
import type Map from '../../map/map';
import type User from '../../user/user';
import { checkContext, DetailedError, WrappedError } from '../../util/logger';
import type MonoContext from '../../util/monoContext';

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
	client.handlers['transferResource'] = require('./transferResource').default;
	client.handlers['sendChat'] = require('./sendChat').default;

	client.registerUnitListener();
	client.registerEventHandler();
	client.registerChatHandler();

}


// TODO refactor this code to use await
export default async function auth(ctx: MonoContext, client: Client, data: Object): Promise<void> {
	checkContext(ctx, 'auth');

	if(!data.planet) { //TODO change from planet to map
		client.sendError(ctx, 'login', 'specify a planet');
	}
	if(!data.username) {
		client.sendError(ctx, 'login', 'invalid username');
	}
	return ctx.db.map.getMap(ctx,data.planet).then((planet: Map): Promise<User> => {
		if(!planet) {
			throw new Error('planet doesn\'t exist');
		}
		client.planet = planet; //TODO remove this when updated in other places
		client.map = planet;

		return ctx.db.user.getUser(data.username);
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
			return ctx.db.user.createUser(data.username, data.color).then((result: Object) => {
				if(result.inserted == 1) {
					const user = result.changes[0].new_val;

					ctx.logger.info(ctx, 'account created', { name: user.name });
					client.user = user;
					client.username = user.name;
					mountUserHandlers(client);

					client.send('login', { apiKey: user.apiKey });
				} else {
					throw new DetailedError('registration failed to insert new user');
				}
			});
		}
	}).catch((err: Error) => {
		client.sendError(ctx, 'login', 'login failed');
		throw new WrappedError(err, 'auth error');
	});
};