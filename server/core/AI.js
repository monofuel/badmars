//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const db = require('../db/db.js');
const env = require('../config/env.js');
const logger = require('../util/logger.js');
const grpc = require('grpc');
const ai = grpc.load(__dirname + '/../../protos/ai.proto').ai;


exports.init = () => {
	let server = new grpc.Server();
	server.addProtoService(ai.AI.service, {
		processUnit: GRPCProcessUnit
	});

	server.bind('0.0.0.0:' + env.aiPort,grpc.ServerCredentials.createInsecure());
	server.start();
	console.log('AI GRPC server started');

	process.on('exit', () => {
		//GRPC likes to hang and prevent a proper shutdown for some reason
		server.forceShutdown();
	});


	return;
};

async function GRPCProcessUnit(call,callback) {
	const request = call.request;
	const uuid = request.uuid;
	const mapName = request.mapName;
	const tick = parseInt(request.tick);
	logger.addSumStat('unitRequest',1);
	//console.log('got process unit order: ', uuid,' for map ',mapName, ' on tick ',tick);
	try {
		const unit = await db.units[mapName].claimUnitTick(uuid,tick);
		if (unit) {
			await processUnit(unit);
		}


		callback(null,{success:true});
	} catch (err) {
		logger.error(err);
		callback(err);
	}
}

async function processUnit(unit) {
	//logger.addSumStat('unit_AI',1);
	await unit.simulate();
}
