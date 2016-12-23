/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Chunk from '../map/chunk';
import helper from '../util/socketFilter';
import grpc from 'grpc';
import { Context } from 'node-context';

const chunkService = grpc.load(__dirname + '/../../protos/chunk.proto').chunk;

exports.init = async() => {
	const server = new grpc.Server();
	server.addProtoService(chunkService.Map.service, {
		getChunk
	});

	server.bind('0.0.0.0:' + env.mapPort, grpc.ServerCredentials.createInsecure());
	server.start();

	console.log('Map GRPC server started');

	process.on('exit', () => {
		//GRPC likes to hang and prevent a proper shutdown for some reason
		server.forceShutdown();
	});

	return;
}

async function getChunk(call, callback) {
	const request = call.request;
	const mapName = request.mapName;
	const x = parseInt(request.x);
	const y = parseInt(request.y);
	let map = await db.map.getMap(mapName);

	let localChunk = await map.fetchOrGenChunk(x, y);

	let chunk = new Chunk();
	chunk.clone(localChunk);

	for(let i = 0; i < chunk.navGrid.length; i++) {
		chunk.navGrid[i] = { items: chunk.navGrid[i] };
	}
	for(let i = 0; i < chunk.grid.length; i++) {
		chunk.grid[i] = { items: chunk.grid[i] };
	}
	chunk = helper.sanitizeChunk(chunk);
	callback(null, chunk);
}
