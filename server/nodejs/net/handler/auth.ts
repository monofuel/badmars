
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Client from '../client';
import Map from '../../map/map';
import db from '../../db';
import Context from '../../context';

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

async function mountUserHandlers(client: Client): Promise<void> {
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

	await client.registerUnitListener();
	await client.registerUserListener();
	await client.registerEventHandler();

}


// TODO refactor this code to use await
export default async function auth(ctx: Context, client: Client, data: any): Promise<void> {
	ctx.check('auth');
	if (!data.planet) { //TODO change from planet to map
		client.sendError(ctx, 'login', 'specify a planet');
	}
	const planetDB = await db.getPlanetDB(ctx, data.planet);
	const planet: Map = planetDB.planet;
	if (!planet) {
		throw new Error('planet doesn\'t exist');
	}
	client.planet = planet;
	client.map = planet; //TODO remove this when updated in other places
	await mountUserHandlers(client);

	client.send('login');
};