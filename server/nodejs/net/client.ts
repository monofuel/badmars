
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as WebSocket from 'ws';
import * as _ from 'lodash';
import * as http from 'http';

import logger, { DetailedError, WrappedError } from '../logger';
import { sanitizeUnit, sanitizeUser } from '../util/socketFilter';
import Context from '../context';
import db from '../db';
import User from '../user';
import Map from '../map/map';
import Unit from '../unit/unit';
import { GameEvent, ChatEvent } from '../db';
import * as jsonpatch from 'fast-json-patch';

import auth from './handler/auth';

const KEEP_ALIVE = 5000;

type NetHandler = (ctx: Context, client: Client, data: Object) => Promise<void>;
type ChunkHash = string;
type HandlerMapType = {
	[key: string]: NetHandler
};

export default class Client {
	ws: WebSocket;
	auth: boolean;
	handlers: HandlerMapType;
	keepAlive: NodeJS.Timer;
	map: Map;
	unitStatWatcher: any;
	planet: Map;
	user: User;
	username: string;
	ctx: Context;
	loadedChunks: ChunkHash[];

	constructor(ctx: Context, ws: WebSocket, req: http.IncomingMessage) {
		this.ws = ws;
		this.auth = false;
		this.handlers = {};
		this.ctx = ctx;
		this.user = (req as any).user;
		this.loadedChunks = [];
		this.handlers['login'] = auth;

		logger.info(ctx, 'client connected');

		ws.on('message', async (msg: string): Promise<void> => {
			try {
				await this.handleFromClient(ctx.create(), msg);
			} catch (err) {
				logger.trackError(ctx, new WrappedError(err, 'failed to handle network message', { msg }));
			}
		});
		ws.on('error', (err: Error) => {
			logger.trackError(ctx, new WrappedError(err, 'websocket error'));
		});

		ws.on('close', () => {
			this.handleLogOut();
		});

		this.send('connected');

		this.keepAlive = setInterval(() => {
			try {
				this.ws.ping();
			} catch (err) {
				clearInterval(this.keepAlive);
			}
		}, KEEP_ALIVE);
	}

	send(type: string, data?: any) {
		if (!this.ws) {
			//logger.errorWithInfo('sending data on closed websocket', { type, data });
			return;
		}
		data = data || {};
		data.type = type;
		data.success = true;
		try {
			//console.log('sending ', type);
			this.ws.send(JSON.stringify(data));
		} catch (err) {
			this.handleLogOut();
		}
	}

	sendError(ctx: Context, type: string, errMsg: string) {
		logger.info(ctx, 'client error', { errMsg, type });
		try {
			this.ws.send(JSON.stringify({
				type: type,
				success: false,
				reason: errMsg
			}));
		} catch (err) {
			this.handleLogOut();
		}
	}

	handleLogOut() {
		logger.info(this.ctx, 'client closed connection');
		if (this.username) {
			logger.info(this.ctx, 'logout', {
				player: this.username
			});
		}
		if (this.unitStatWatcher) {
			this.unitStatWatcher.close();
		}
		clearInterval(this.keepAlive);
		this.ws = null;
	}

	async handleFromClient(ctx: Context, dataText: string): Promise<void> {
		//console.log('received' + data);
		const data: any = JSON.parse(dataText);
		if (!data.type || !this.handlers[data.type]) {
			this.sendError(ctx, 'invalid', 'invalid request');
			return;
		}
		if (typeof this.handlers[data.type] !== 'function') {
			throw new DetailedError('bad handler', { handle: data.type, type: typeof this.handlers[data.type] });
		}
		await this.handlers[data.type](ctx, this, data);
	}

	async registerUnitListener(): Promise<void> {
		const planetDB = await db.getPlanetDB(this.ctx, this.map.name);
		await planetDB.unit.watch(this.ctx, async (ctx: Context, { next: unit, prev: oldUnit }): Promise<void> => {
			await this.handleUnitUpdate(ctx, unit, oldUnit);
		});
	}

	async registerUserListener(): Promise<void> {
		await db.user.watch(this.ctx, async (ctx: Context, { next }): Promise<void> => {
			await this.handleUserUpdate(ctx, next);
		});
	}

	async registerEventHandler(): Promise<void> {
		db.event.watch(this.ctx, async (ctx: Context, e: GameEvent): Promise<void> => {
			if (e.type === 'chat') {
				this.handleChat(ctx, e);
			} else {
				this.handleEvents(ctx, e);
			}
		});
	}

	async handleUnitUpdate(ctx: Context, unit: Unit, oldUnit?: Unit): Promise<void> {

		// TODO unit death should be handled by the event system

		// check if unit is on a chunk the player sees
		if (_.intersection(unit.location.chunkHash, this.loadedChunks).length === 0) {
			return;
		}

		// TODO fog of war

		const sanitizedNewUnit = sanitizeUnit(unit, this.user.uuid);

		if (oldUnit) {
			//console.log('unit change');
			const sanitizedOldUnit = sanitizeUnit(oldUnit, this.user.uuid);
			if (!_.isEqual(sanitizedNewUnit, sanitizedOldUnit)) {
				this.send('unitDelta', {
					uuid: sanitizedNewUnit.uuid,
					delta: jsonpatch.compare(sanitizedOldUnit, sanitizedNewUnit)
				});
			}
		} else {
			this.send('units', {
				units: [sanitizedNewUnit]
			});
		}
	}

	async handleUserUpdate(ctx: Context, user: User) {
		const newUser = sanitizeUser(user);
		this.send('players', { players: [newUser] });
	}

	async handleEvents(ctx: Context, gameEvent: any) {
		if (gameEvent.name !== 'server_gameEvent') {
			return;
		}

		switch (gameEvent.type) {
			case 'attack':
				if (!gameEvent.enemyId) {
					logger.trackError(ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type }));
				}
				if (!gameEvent.unitId) {
					logger.trackError(ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type }));
				}
				this.send('attack', { enemyId: gameEvent.enemyId, unitId: gameEvent.unitId });
				break;
			case 'kill':
				if (!gameEvent.unitId) {
					logger.trackError(ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type }));
				}
				this.send('attack', { unitId: gameEvent.unitId });
				break;
			default:
				logger.trackError(ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type }));
		}
	}

	async handleChat(ctx: Context, e: ChatEvent): Promise<void> {
		// TODO filtering based on channel and planet
		this.send('chat', e);
	}
}