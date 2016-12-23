/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import grpc from 'grpc';
import context from 'node-context';

const AI = grpc.load(__dirname + '/../../protos/ai.proto').ai;

exports.init = () => {
	let server = new grpc.Server();
	server.addProtoService(AI.AI.service, {
		processUnit: GRPCProcessUnit
	});

	server.bind('0.0.0.0:' + env.aiPort, grpc.ServerCredentials.createInsecure());
	server.start();
	logger.info('AI GRPC server started');

	process.on('exit', () => {
		//GRPC likes to hang and prevent a proper shutdown for some reason
		server.forceShutdown();
	});


	return;
};

async function GRPCProcessUnit(call, callback: Function) {
	const request = call.request;
	const uuid = request.uuid;
	const mapName = request.mapName;
	const tick = parseInt(request.tick);
	logger.addSumStat('unitRequest', 1);
	logger.info('process unit order', { uuid, mapName, tick });
	const ctx = new context.context({ timeout: 1000 / env.ticksPerSec });
	try {
		const unit = await db.units[mapName].claimUnitTick(ctx, uuid, tick);
		if (!unit) {
			logger.info('unit missing', { uuid });
			throw new Error('unit missing');
		}
		await processUnit(ctx, unit);
		logger.checkContext(ctx, "processing unit");

		callback(null, { success: true });
	} catch (err) {
		logger.error(err);
		callback(err);
	}
}

async function processUnit(ctx: context, unit: Unit) {
	//logger.addSumStat('unit_AI',1);
	await unit.simulate(ctx);
}
