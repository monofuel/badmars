/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import grpc from 'grpc';
import MonoContext from '../util/monoContext';

import env from '../config/env';
import { checkContext } from '../util/logger';

import Chunk from '../map/chunk';
import filter from '../util/socketFilter';

import type Logger from '../util/logger';
import { WrappedError } from '../util/logger';
import type DB from '../db/db';

type RequestMapType = {
	[key: string]: MonoContext
};

export default class PlanetService {
	db: DB;
	logger: Logger;
	requests: RequestMapType = {};
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	async init(): Promise<void> {

		const server = new grpc.Server();
		const chunkService = grpc.load(__dirname + '/../../../protos/chunk.proto').chunk;

		server.addProtoService(chunkService.Map.service, {
			getChunk: (call: grpc.Call, callback: Function): any => this.getChunk(call, callback)
		});

		server.bind('0.0.0.0:' + env.mapPort, grpc.ServerCredentials.createInsecure());
		server.start();

		this.logger.info(this.makeCtx(), 'Map GRPC server started');
		setInterval((): void => this.logRequests(), 6 * 1000);

		process.on('exit', () => {
			//GRPC likes to hang and prevent a proper shutdown for some reason
			server.forceShutdown();
		});
	}

	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}

	logRequests() {
		const count = Object.keys(this.requests).length;
		this.logger.info(this.makeCtx(), 'chunk_requests', { count }, { silent: count === 0 });
	}

	async getChunk(call: grpc.Call, callback: Function): Promise<void> {
		const ctx: MonoContext = this.makeCtx(1000);
		try {
			this.requests[ctx.uuid] = ctx;
			const request = call.request;
			const mapName = request.mapName;
			const x = parseInt(request.x);
			const y = parseInt(request.y);
			const chunk: Chunk = await this.fetchOrGenChunk(ctx, mapName, x, y);
			callback(null, chunk);
		} catch (err) {
			this.logger.trackError(ctx, new WrappedError(err, 'failed to get chunk', { map: call.request.mapName, x: call.request.x, y: call.request.y }));
			callback(err);
		} finally {
			delete this.requests[ctx.uuid];
		}
	}

	// returns a special object for GPRC
	// we have to fiddle with the 2d array for GPRC
	async fetchOrGenChunk(ctx: MonoContext, mapName: string, x: number, y: number): Promise<Object> {
		checkContext(ctx, 'fetchOrGenChunk');
		const map = await this.db.map.getMap(ctx, mapName);

		const localChunk = await map.fetchOrGenChunk(ctx, x, y);

		const chunk: Object = new Chunk(mapName, x, y);
		chunk.clone(localChunk);
		chunk.syncValidate();

		for (let i = 0; i < chunk.navGrid.length; i++) {
			chunk.navGrid[i] = { items: chunk.navGrid[i] };
		}
		for (let i = 0; i < chunk.grid.length; i++) {
			chunk.grid[i] = { items: chunk.grid[i] };
		}
		return filter.sanitizeChunk(chunk);
	}
}