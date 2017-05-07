/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
import env from '../config/env';

import grpc from 'grpc';

import type Unit from '../unit/unit';
import { checkContext, WrappedError, DetailedError } from '../util/logger';
import MonoContext from '../util/monoContext';

import type Logger from '../util/logger';
import type DB from '../db/db';

const AI = grpc.load(__dirname + '/../../protos/ai.proto').ai;

export default class AIService {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}

	async init(): Promise<void> {
		const server = new grpc.Server();
		const ctx = this.makeCtx();
		server.addProtoService(AI.AI.service, {
			processUnit: (call: grpc.Call, callback: Function): Promise<void> =>
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

	async GRPCProcessUnit(ctx: MonoContext, call: grpc.Call, callback: Function): Promise<void> {
		const request = call.request;
		const uuid = request.uuid;
		const mapName = request.mapName;
		const tick = parseInt(request.tick);
		ctx.tick = tick;
		ctx.logger.addSumStat('unitRequest', 1);
		ctx.logger.info(ctx, 'process unit order', { uuid, mapName, tick }, { silent: true });
		try {
			const unit = await ctx.db.units[mapName].claimUnitTick(ctx, uuid, tick);
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

	async processUnit(ctx: MonoContext, unit: Unit): Promise<void> {
		//logger.addSumStat('unit_AI',1);
		await unit.simulate(ctx);
	}
}