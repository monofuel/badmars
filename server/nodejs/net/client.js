/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import WebSocket from 'ws';
import _ from 'lodash';

import logger from '../util/logger';
import filter from '../util/socketFilter';
import Context from 'node-context';
import hat from 'hat';
import type User from '../user/user';
import type Map from '../map/map';

const KEEP_ALIVE = 5000;

type HandlerMapType = {
	[string]: NetHandler
};

class Client {
	ws: WebSocket;
	auth: boolean;
	handlers: HandlerMapType;
	keepAlive: number;
	map: Map;
	unitStatWatcher: any;
	planet: Map;
	user: User;
	username: string;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.auth = false;
		this.handlers = {};
		this.handlers['login'] = require('./handler/auth').default;

		ws.on('message', (msg: string) => {
			try {
				this.handleFromClient(msg);
			} catch (err) {
				logger.error(err);
			}
		});
		ws.on('error', (err: Error) => {
			logger.error(err);
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
			logger.errorWithInfo('sending data on closed websocket', { type, data });
			return;
		}
		data = data || {};
		data.type = type;
		data.success = true;
		try {
			console.log('sending ', type);
			this.ws.send(JSON.stringify(data));
		} catch(err) {
			this.handleLogOut();
		}
	}

	sendError(type: string, errMsg: string) {
		logger.info('client error', {errMsg, type});
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
		logger.info('client closed connection');
		if(this.username) {
			logger.info('logout', {
				player: this.username
			});
		}
		if(this.unitStatWatcher) {
			this.unitStatWatcher.close();
		}
		clearInterval(this.keepAlive);
		this.ws = null;
	}

	handleFromClient(dataText: string) {
		const uuid = hat();
		const ctx = new Context({ uuid, timeout: 1000 });
		//console.log('received' + data);
		const data: Object = JSON.parse(dataText);
		console.log('got command', data.type);
		if(!data.type || !this.handlers[data.type]) {
			this.sendError('invalid', 'invalid request');
			return;
		}
		if (typeof this.handlers[data.type] !== 'function') {
			logger.errorWithInfo('bad handler',{ handle: data.type, type: typeof this.handlers[data.type]});
			return;
		}
		this.handlers[data.type](ctx, this, data);
	}

	registerUnitListener() {
		db.units[this.map.name].registerListener((err: Error, delta: Object) => {
			this.handleUnitUpdate(err, delta);
		});
	}

	registerEventHandler() {
		db.event.watchEvents((err: Error, delta: Object) => {
			this.handleEvents(err, delta);
		});
	}

	registerChatHandler() {
		db.chat.watchChat((err: Error, delta: Object) => {
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
			logger.error(err);
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
				logger.errorWithInfo('invalid event', { id: gameEvent.id, type: gameEvent.type});
			}
			if(!gameEvent.unitId) {
				logger.errorWithInfo('invalid event', { id: gameEvent.id, type: gameEvent.type});
			}
			this.send('attack', { enemyId: gameEvent.enemyId, unitId: gameEvent.unitId });
			break;
		case 'kill':
			if(!gameEvent.unitId) {
				logger.errorWithInfo('invalid event', { id: gameEvent.id, type: gameEvent.type});
			}
			this.send('attack', { unitId: gameEvent.unitId });
			break;
		default:
			logger.errorWithInfo('invalid event', { id: gameEvent.id, type: gameEvent.type});
		}
	}

	handleChat(err: Error, data: Object) {
		if(err) {
			logger.error(err,'chat handler error');
			return;
		}
		this.send('chat', data.new_val);
	}
}
module.exports = Client;

const db = require('../db/db');