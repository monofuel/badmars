//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const db = require('../db/db.js');
const env = require('../config/env.js');
const logger = require('../util/logger.js');
import {Chunk} from '../map/chunk.js';
const helper = require('../util/socketFilter.js');
const grpc = require('grpc');
const chunkService = grpc.load(__dirname + '/../../protos/chunk.proto').chunk;

exports.init = async () => {
	const server = new grpc.Server();
	server.addProtoService(chunkService.Map.service, {
		getChunk
	});

	server.bind('0.0.0.0:' + env.mapPort,grpc.ServerCredentials.createInsecure());
	server.start();

	console.log('Map GRPC server started');

	process.on('exit', () => {
		//GRPC likes to hang and prevent a proper shutdown for some reason
		server.forceShutdown();
	});

	return;
}

async function getChunk(call,callback) {
	const request = call.request;
	const mapName = request.mapName;
	const x = parseInt(request.x);
	const y = parseInt(request.y);
	let map = await db.map.getMap(mapName);

	let localChunk = await map.fetchOrGenChunk(x,y);

	let chunk = new Chunk();
	chunk.clone(localChunk);

	for (let i = 0; i < chunk.navGrid.length; i++) {
		chunk.navGrid[i] = {items:chunk.navGrid[i]};
	}
	for (let i = 0; i < chunk.grid.length; i++) {
		chunk.grid[i] = {items:chunk.grid[i]};
	}
	chunk = helper.sanitizeChunk(chunk);
	callback(null,chunk);
}
