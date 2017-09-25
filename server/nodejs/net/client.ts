
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as WebSocket from 'ws';
import * as _ from 'lodash';

import { DetailedError, WrappedError } from '../util/logger';
import { sanitizeUnit, sanitizeUser } from '../util/socketFilter';
import Context from '../util/context';
import User from '../user/user';
import Map from '../map/map';
import * as jsonpatch from 'fast-json-patch';

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

	constructor(ctx: Context, ws: WebSocket) {
		this.ws = ws;
		this.auth = false;
		this.handlers = {};
		this.ctx = ctx;
		this.user = (this.ws as any).upgradeReq.user;
		this.loadedChunks = [];
		this.handlers['login'] = require('./handler/auth').default;

		ctx.logger.info(ctx, 'client connected');

		ws.on('message', async (msg: string): Promise<void> => {
			try {
				await this.handleFromClient(ctx.create(), msg);
			} catch (err) {
				ctx.logger.trackError(ctx, new WrappedError(err, 'failed to handle network message', { msg }));
			}
		});
		ws.on('error', (err: Error) => {
			ctx.logger.trackError(ctx, new WrappedError(err, 'websocket error'));
		});

		ws.on('close', () => {
			this.handleLogOut();
		});

		this.send('connected');

		this.keepAlive = setInterval(() => {
			try {
				this.ws.ping();
			} catch(err) {
				clearInterval(this.keepAlive);
			}
		}, KEEP_ALIVE);
	}

	send(type: string, data?: any) {
		if(!this.ws) {
			//logger.errorWithInfo('sending data on closed websocket', { type, data });
			return;
		}
		data = data || {};
		data.type = type;
		data.success = true;
		try {
			//console.log('sending ', type);
			this.ws.send(JSON.stringify(data));
		} catch(err) {
			this.handleLogOut();
		}
	}

	sendError(ctx: Context, type: string, errMsg: string) {
		ctx.logger.info(ctx, 'client error', { errMsg, type });
		try {
			this.ws.send(JSON.stringify({
				type: type,
				success: false,
				reason: errMsg
			}));
		} catch(err) {
			this.handleLogOut();
		}
	}

	handleLogOut() {
		this.ctx.logger.info(this.ctx, 'client closed connection');
		if(this.username) {
			this.ctx.logger.info(this.ctx, 'logout', {
				player: this.username
			});
		}
		if(this.unitStatWatcher) {
			this.unitStatWatcher.close();
		}
		clearInterval(this.keepAlive);
		this.ws = null;
	}

	async handleFromClient(ctx: Context, dataText: string): Promise<void> {
		//console.log('received' + data);
		const data: any = JSON.parse(dataText);
		if(!data.type || !this.handlers[data.type]) {
			this.sendError(ctx, 'invalid', 'invalid request');
			return;
		}
		if (typeof this.handlers[data.type] !== 'function') {
			throw new DetailedError('bad handler',{ handle: data.type, type: typeof this.handlers[data.type]});
		}
		await this.handlers[data.type](ctx, this, data);
	}

	registerUnitListener() {
		this.ctx.db.units[this.map.name].registerListener((err: Error, delta: Object) => {
			this.handleUnitUpdate(err, delta);
		});
	}

	registerUserListener() {
		this.ctx.db.user.registerListener((err: Error, delta: object) => {
			this.handleUserUpdate(err, delta);
		});
	}

	registerEventHandler() {
		this.ctx.db.event.watchEvents((err: Error, delta: Object) => {
			this.handleEvents(err, delta);
		});
	}

	registerChatHandler() {
		this.ctx.db.chat.watchChat((err: Error, delta: Object) => {
			this.handleChat(err, delta);
		});
	}

	//TODO also handle player list updates
	handleUnitUpdate(err: Error, delta: any) {

		if(!delta.new_val) {
			if(delta.old_val) {
				//TODO update client for new 'kill' system.
				this.send('kill', {
					unitId: delta.old_val.uuid
				});
			}
		} else {
			// check if unit is on a chunk the player sees
			if (_.intersection(delta.new_val.location.chunkHash, this.loadedChunks).length === 0) {
				return;
			}
			// TODO fog of war

			const newUnit = sanitizeUnit(delta.new_val, this.user.uuid);

			if(delta.old_val) {
				//console.log('unit change');
				const oldUnit = sanitizeUnit(delta.old_val, this.user.uuid);
				if(!_.isEqual(newUnit, oldUnit)) {
					this.send('unitDelta', {
						uuid: newUnit.uuid,
						delta: jsonpatch.compare(oldUnit, newUnit)
					});
				}
			} else {
				this.send('units', {
					units: [newUnit]
				});
			}
		}
	}

	handleUserUpdate(err: Error, delta: any) {
		if (delta.new_val) {
			// console.log('user delta', delta);
			const newUser = sanitizeUser(delta.new_val);
			this.send('players', { players: [newUser] });
		}
	}

	handleEvents(err: Error, data: any) {
		if(err) {
			this.ctx.logger.trackError(this.ctx, new WrappedError(err, 'client handle events'));
			return;
		}

		//console.log('recieving event');
		//console.log(data.new_val);
		const gameEvent = data.new_val;
		if(gameEvent.name !== 'server_gameEvent') {
			return;
		}

		switch(gameEvent.type) {
		case 'attack':
			if(!gameEvent.enemyId) {
				this.ctx.logger.trackError(this.ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
			}
			if(!gameEvent.unitId) {
				this.ctx.logger.trackError(this.ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
			}
			this.send('attack', { enemyId: gameEvent.enemyId, unitId: gameEvent.unitId });
			break;
		case 'kill':
			if(!gameEvent.unitId) {
				this.ctx.logger.trackError(this.ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
			}
			this.send('attack', { unitId: gameEvent.unitId });
			break;
		default:
			this.ctx.logger.trackError(this.ctx, new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
		}
	}

	handleChat(err: Error, data: any) {
		if(err) {
			this.ctx.logger.trackError(this.ctx, new WrappedError(err, 'chat handler error'));
			return;
		}
		this.send('chat', data.new_val);
	}
}