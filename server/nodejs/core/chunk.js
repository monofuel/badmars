/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Hat from 'hat';
import Chunk from '../map/chunk';
import helper from '../util/socketFilter';
import grpc from 'grpc';
import { Context } from 'node-context';

const requests = {};

const chunkService = grpc.load(__dirname + '/../../protos/chunk.proto').chunk;

exports.init = async() => {
	const server = new grpc.Server();
	server.addProtoService(chunkService.Map.service, {
		getChunk
	});

	server.bind('0.0.0.0:' + env.mapPort, grpc.ServerCredentials.createInsecure());
	server.start();

	console.log('Map GRPC server started');
	setInterval(logRequests, 6 * 1000);

	process.on('exit', () => {
		//GRPC likes to hang and prevent a proper shutdown for some reason
		server.forceShutdown();
	});

	return;
}

function logRequests() {
	logger.info('chunk_requests', { count: Object.keys(requests).length });
}

async function getChunk(call, callback) {
	const uuid = Hat();
	try {
		const ctx = new Context({ uuid, timeout: 1000 });
		requests[uuid] = ctx;
		const request = call.request;
		const mapName = request.mapName;
		const x = parseInt(request.x);
		const y = parseInt(request.y);
		const chunk: Chunk = await fetchOrGenChunk(ctx, mapName, x, y);
		callback(null, chunk);
	} catch(err) {
		logger.error(err);
		callback(err);
	} finally {
		delete requests[uuid];
	}
}

// returns a special object for GPRC
// we have to fiddle with the 2d array for GPRC
async function fetchOrGenChunk(ctx: Context, mapName: string, x: number, y: number): Promise <Object> {
	console.log(mapName, x, y);
	let map = await db.map.getMap(ctx, mapName);

	let localChunk = await map.fetchOrGenChunk(ctx, x, y);

	const chunk: Object = new Chunk();
	chunk.clone(localChunk);

	for(let i = 0; i < chunk.navGrid.length; i++) {
		chunk.navGrid[i] = { items: chunk.navGrid[i] };
	}
	for(let i = 0; i < chunk.grid.length; i++) {
		chunk.grid[i] = { items: chunk.grid[i] };
	}
	return helper.sanitizeChunk(chunk);
}
