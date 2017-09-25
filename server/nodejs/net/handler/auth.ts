
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Client from '../client';
import Map from '../../map/map';
import { checkContext} from '../../util/logger';
import Context from '../../util/context';

import getPlayers from './getPlayers';
import getUnits from './getUnits';
import getMap from './getMap';
import getChunk from './getChunk';
import createGhost from './createGhost';
import spawn from './spawn';
import setDestination from './setDestination';
import unitStats from './unitStats';
import factoryOrder from './factoryOrder';
import transferResource from './transferResource';
import sendChat from './sendChat';

function mountUserHandlers(client: Client) {
	client.handlers['getPlayers'] = getPlayers;
	client.handlers['getUnits'] = getUnits;
	client.handlers['getMap'] = getMap;
	client.handlers['getChunk'] = getChunk;
	client.handlers['createGhost'] = createGhost;
	client.handlers['spawn'] = spawn;
	client.handlers['setDestination'] = setDestination;
	client.handlers['unitStats'] = unitStats;
	client.handlers['factoryOrder'] = factoryOrder;
	client.handlers['transferResource'] = transferResource;
	client.handlers['sendChat'] = sendChat;

	client.registerUnitListener();
	client.registerUserListener();
	client.registerEventHandler();
	client.registerChatHandler();

}


// TODO refactor this code to use await
export default async function auth(ctx: Context, client: Client, data: any): Promise<void> {
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