//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const db = require('../db/db.js');
const env = require('../config/env.js');
const logger = require('../util/logger.js');
const grpc = require('grpc');
const mapservice = grpc.load(__dirname + '/../protos/map.proto').map;


exports.init = () => {
	let server = new grpc.Server();
	server.addProtoService(mapservice.Map.service, {
		getChunk
	});

	server.bind('0.0.0.0:' + env.mapPort,grpc.ServerCredentials.createInsecure());
	server.start();
	console.log('Map GRPC server started');

	return;
}
async function getChunk(call,callback) {
	const request = call.request;
	const mapName = request.mapName;
	const x = parseInt(request.x);
	const y = parseInt(request.y);
	let map = await db.map.getMap(mapName);

	//TODO caching
	let chunk = await map.fetchOrGenChunk(x,y);
	for (let i = 0; i < chunk.navGrid.length; i++) {
		chunk.navGrid[i] = {items:chunk.navGrid[i]};
	}
	for (let i = 0; i < chunk.grid.length; i++) {
		chunk.grid[i] = {items:chunk.grid[i]};
	}

	callback(null,chunk);
}
