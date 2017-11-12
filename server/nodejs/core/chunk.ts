
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const grpc = require('grpc');
import Context from '../context';

import env from '../config/env';
import { checkContext } from '../logger';

import Chunk from '../map/chunk';

import Logger from '../logger';
import { WrappedError } from '../logger';
import { Service } from './';

type RequestMapType = {
	[key: string]: Context
};

export default class PlanetService implements Service {
	private parentCtx: Context;
	requests: RequestMapType = {};

	async init(ctx: Context): Promise<void> {
		this.parentCtx = ctx;
	}

	async stop(): Promise<void> {
		this.parentCtx.info('stopping chunk');
		throw new Error('not implemented');
		// server.forceShutdown();
	}

	async start(): Promise<void> {
		const ctx = this.parentCtx.create();
		const { db, logger } = ctx;

		const server = new grpc.Server();
		const services = grpc.load(__dirname + '/../../../protos/chunk.proto').services;

		server.addProtoService(services.Map.service, {
			getChunk: (call: any, callback: Function): any => this.getChunk(call, callback)
		});

		server.bind('0.0.0.0:' + env.mapPort, grpc.ServerCredentials.createInsecure());
		server.start();

		logger.info(ctx, 'Map GRPC server started');
		setInterval((): void => this.logRequests(), 6 * 1000);

		process.on('exit', () => {
			//GRPC likes to hang and prevent a proper shutdown for some reason
			server.forceShutdown();
		});
	}

	logRequests() {
		const ctx = this.parentCtx.create()
		const { logger } = ctx
		const count = Object.keys(this.requests).length;
		logger.info(ctx, 'chunk_requests', { count }, { silent: count === 0 });
	}

	async getChunk(call: any, callback: Function): Promise<void> {
		const ctx: Context = this.parentCtx.create({ timeout: 1000 });
		const { logger } = ctx;
		try {
			this.requests[ctx.uuid] = ctx;
			const request = call.request;
			const mapName = request.mapName;
			const x = parseInt(request.x);
			const y = parseInt(request.y);
			const chunk: Chunk = await this.fetchOrGenChunk(ctx, mapName, x, y);
			callback(null, chunk);
		} catch (err) {
			logger.trackError(ctx, new WrappedError(err, 'failed to get chunk', { map: call.request.mapName, x: call.request.x, y: call.request.y }));
			callback(err);
		} finally {
			delete this.requests[ctx.uuid];
		}
	}

	// returns a special object for GPRC
	// we have to fiddle with the 2d array for GPRC
	async fetchOrGenChunk(ctx: Context, mapName: string, x: number, y: number): Promise<any> {
		checkContext(ctx, 'fetchOrGenChunk');
		const { db, logger } = ctx;
		const planetDB = await db.getPlanetDB(ctx, mapName);

		const localChunk = await planetDB.planet.fetchOrGenChunk(ctx, x, y);

		// TODO should do proper typescript grpc stuff rather than  butcher this object
		const chunk: any = new Chunk(mapName, x, y);
		chunk.clone(localChunk);
		chunk.syncValidate();

		for (let i = 0; i < chunk.navGrid.length; i++) {
			chunk.navGrid[i] = { items: chunk.navGrid[i] };
		}
		for (let i = 0; i < chunk.grid.length; i++) {
			chunk.grid[i] = { items: chunk.grid[i] };
		}

		return {
			x: chunk.x,
			y: chunk.y,
			map: chunk.map,
			hash: chunk.hash,
			grid: chunk.grid,
			navGrid: chunk.navGrid,
			chunkSize: chunk.chunkSize,
		};
	}
}