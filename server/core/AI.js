/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

import DB from '../db/db';
import Env from '../config/env';
import Logger from '../util/logger';
import Grpc from 'grpc';
import Context from 'node-context';

const AI = Grpc.load(__dirname + '/../../protos/ai.proto').ai;

exports.init = () => {
	let server = new Grpc.Server();
	server.addProtoService(AI.AI.service, {
		processUnit: GRPCProcessUnit
	});

	server.bind('0.0.0.0:' + Env.aiPort,Grpc.ServerCredentials.createInsecure());
	server.start();
	Logger.info('AI GRPC server started');

	process.on('exit', () => {
		//GRPC likes to hang and prevent a proper shutdown for some reason
		server.forceShutdown();
	});


	return;
};

async function GRPCProcessUnit(call,callback: Function) {
	const request = call.request;
	const uuid = request.uuid;
	const mapName = request.mapName;
	const tick = parseInt(request.tick);
	Logger.addSumStat('unitRequest',1);
	Logger.info('process unit order',{uuid, mapName, tick});
	const ctx = new Context.Context({timeout: 1000 / Env.TICKS_PER_SEC});
	try {
		const unit = await DB.units[mapName].claimUnitTick(ctx,uuid,tick);
		if (!unit) {
			Logger.info('unit missing',{uuid});
			throw new Error('unit missing');
		}
		await processUnit(ctx,unit);
		Logger.checkContext(ctx,"processing unit");

		callback(null,{success:true});
	} catch (err) {
		Logger.error(err);
		callback(err);
	}
}

async function processUnit(ctx,unit) {
	//logger.addSumStat('unit_AI',1);
	await unit.simulate(ctx);
}
