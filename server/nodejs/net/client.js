/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import WebSocket from 'ws';
import _ from 'lodash';

import { DetailedError, WrappedError } from '../util/logger';
import filter from '../util/socketFilter';
import MonoContext from '../util/monoContext';
import type User from '../user/user';
import type Map from '../map/map';

const KEEP_ALIVE = 5000;

type HandlerMapType = {
	[string]: NetHandler
};

export default class Client {
	ws: WebSocket;
	auth: boolean;
	handlers: HandlerMapType;
	keepAlive: number;
	map: Map;
	unitStatWatcher: any;
	planet: Map;
	user: User;
	username: string;
	ctx: MonoContext;

	constructor(ctx: MonoContext, ws: WebSocket) {
		this.ws = ws;
		this.auth = false;
		this.handlers = {};
		this.ctx = ctx;
		this.handlers['login'] = require('./handler/auth').default;

		ws.on('message', async (msg: string): Promise<void> => {
			try {
				await this.handleFromClient(msg);
			} catch (err) {
				ctx.logger.trackError(new WrappedError(err, 'failed to handle network message', { msg }));
			}
		});
		ws.on('error', (err: Error) => {
			ctx.logger.trackError(new WrappedError(err, 'websocket error'));
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

	send(type: string, data?: Object) {
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

	sendError(ctx: MonoContext, type: string, errMsg: string) {
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

	async handleFromClient(dataText: string): Promise<void> {
		const ctx = this.ctx.create({ timeout: 1000 });
		//console.log('received' + data);
		const data: Object = JSON.parse(dataText);
		//console.log('got command', data.type);
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
	handleUnitUpdate(err: Error, delta: Object) {
		if(!delta.new_val) {
			if(delta.old_val) {
				//TODO update client for new 'kill' system.
				this.send('kill', {
					unitId: delta.old_val.uuid
				});
			}
		} else {
			//TODO compare old vs new and optimize network usage. only send changes and only send things that the client should act on.
			//TODO like seriously
			//TODO this is awful

			const newUnit = filter.sanitizeUnit(delta.new_val);

			if(delta.old_val) {
				//console.log('unit change');
				const oldUnit = filter.sanitizeUnit(delta.old_val);
				if(!_.isEqual(newUnit, oldUnit)) {
					//console.log('sending unit update');
					//if (newUnit.iron != oldUnit.iron) {
					//	console.log('sending iron change');
					//}
					this.send('units', {
						units: [newUnit]
					});
				}
			} else {
				this.send('units', {
					units: [newUnit]
				});
			}
		}
	}

	handleEvents(err: Error, data: Object) {
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
				this.ctx.logger.trackError(new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
			}
			if(!gameEvent.unitId) {
				this.ctx.logger.trackError(new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
			}
			this.send('attack', { enemyId: gameEvent.enemyId, unitId: gameEvent.unitId });
			break;
		case 'kill':
			if(!gameEvent.unitId) {
				this.ctx.logger.trackError(new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
			}
			this.send('attack', { unitId: gameEvent.unitId });
			break;
		default:
			this.ctx.logger.trackError(new DetailedError('invalid event', { id: gameEvent.id, type: gameEvent.type}));
		}
	}

	handleChat(err: Error, data: Object) {
		if(err) {
			this.ctx.logger.trackError(this.ctx, new WrappedError(err, 'chat handler error'));
			return;
		}
		this.send('chat', data.new_val);
	}
}