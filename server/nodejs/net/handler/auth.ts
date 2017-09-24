
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Client from '../client';
import Map from '../../map/map';
import { checkContext} from '../../util/logger';
import MonoContext from '../../util/monoContext';

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
	client.registerUserListener();
	client.registerEventHandler();
	client.registerChatHandler();

}


// TODO refactor this code to use await
export default async function auth(ctx: MonoContext, client: Client, data: Object): Promise<void> {
	checkContext(ctx, 'auth');

	if(!data.planet) { //TODO change from planet to map
		client.sendError(ctx, 'login', 'specify a planet');
	}
	const planet: Map = await ctx.db.map.getMap(ctx,data.planet);
	if(!planet) {
		throw new Error('planet doesn\'t exist');
	}
	client.planet = planet;
	client.map = planet; //TODO remove this when updated in other places

	client.username = client.user.name; // TODO what is this used for?
	mountUserHandlers(client);

	client.send('login');
};