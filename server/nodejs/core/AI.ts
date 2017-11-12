
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import env from '../config/env';
const grpc = require('grpc');

import Unit from '../unit/unit';
import { checkContext, WrappedError, DetailedError } from '../logger';
import Context from '../context';
import { Service } from './'

const services = grpc.load(__dirname + '/../../../protos/ai.proto').services;

export default class AIService implements Service {
	private parentCtx: Context;
	async init(ctx: Context) {
		this.parentCtx = ctx;
	}

	async start(): Promise<void> {
		const server = new grpc.Server();
		const ctx = this.parentCtx.create();
		server.addProtoService(services.AI.service, {
			processUnit: (call: any, callback: Function): Promise<void> =>
				this.GRPCProcessUnit(ctx.create({ timeout: 1000 / env.ticksPerSec }), call, callback)
		});

		server.bind('0.0.0.0:' + env.aiPort, grpc.ServerCredentials.createInsecure());
		server.start();
		ctx.logger.info(ctx, 'AI GRPC server started');

		process.on('exit', () => {
			//GRPC likes to hang and prevent a proper shutdown for some reason
			server.forceShutdown();
		});
	}

	async GRPCProcessUnit(ctx: Context, call: any, callback: Function): Promise<void> {
		const request = call.request;
		const uuid = request.uuid;
		const mapName = request.mapName;
		const tick = parseInt(request.tick);
		ctx.tick = tick;
		ctx.logger.addSumStat('unitRequest', 1);
		ctx.logger.info(ctx, 'process unit order', { uuid, mapName, tick }, { silent: true });
		const planetDB = await ctx.db.getPlanetDB(ctx, mapName);
		try {
			const unit = await planetDB.unit.claimUnitTick(ctx, uuid, tick);
			if (!unit) {
				throw new DetailedError('unit missing', { uuid });
			}
			await this.processUnit(ctx, unit);
			checkContext(ctx, 'processing unit');
			callback(null, { success: true });
		} catch (err) {
			ctx.logger.trackError(ctx, new WrappedError(err, 'proccess unit GRPC'));
			callback(err);
		}
	}

	async processUnit(ctx: Context, unit: Unit): Promise<void> {
		//logger.addSumStat('unit_AI',1);
		await unit.simulate(ctx);
	}

	async stop(): Promise<void> {
		this.parentCtx.info('stopping ai');
		throw new Error('not implemented');
	}
}