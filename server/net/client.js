/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import WebSocket from 'ws';
import _ from 'lodash';

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import authHandler from '../net/handler/auth';
import Map from '../map/map';
import filter from '../util/socketFilter';
import Context from 'node-context';
import hat from 'hat';

const KEEP_ALIVE = 5000;

type HandlerMap = {
	[string]: NetHandler
}

class Client {
	ws: WebSocket;
	auth: boolean;
	handlers: HandlerMap;
	keepAlive: number;
	map: Map;
	unitStatWatcher: any;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.auth = false;
		this.handlers = {};
		this.handlers['login'] = authHandler;

		var self = this;

		ws.on('message', (msg) => {
			self.handleFromClient(msg);
		});
		ws.on('error', (err) => {
			logger.error(err);
		});

		ws.on('close', () => {
			self.handleLogOut();
		});

		this.send('connected');

		this.keepAlive = setInterval(() => {
			try {
				this.ws.ping();
			} catch(err) {
				clearInterval(self.keepAlive);
			}
		}, KEEP_ALIVE);
	}

	send(type: string, data?: Object) {
		if(!this.ws) return;
		data = data || {};
		data.type = type;
		data.success = true;
		try {
			this.ws.send(JSON.stringify(data));
		} catch(err) {
			this.handleLogOut();
		}
	}

	sendError(type: string, errMsg: string) {
		console.log('client error: ' + type);
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

		if(!data.type || !this.handlers[data.type]) {
			this.sendError('invalid', 'invalid request');
			return;
		}
		if (typeof this.handlers[data.type] !== 'function') {
			console.log('bad handler for',data.type,typeof this.handlers[data.type]);
			return;
		}
		this.handlers[data.type](ctx, this, data);
	}

	registerUnitListener() {
		var self = this;
		db.units[this.map.name].registerListener((err, delta) => {
			self.handleUnitUpdate(err, delta);
		});
	}

	registerEventHandler() {
		var self = this;
		db.event.watchEvents((err, delta) => {
			self.handleEvents(err, delta);
		});
	}

	registerChatHandler() {
		var self = this;
		db.chat.watchChat((err, delta) => {
			self.handleChat(err, delta);
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

			let newUnit = filter.sanitizeUnit(delta.new_val);

			if(delta.old_val) {
				//console.log('unit change');
				let oldUnit = filter.sanitizeUnit(delta.old_val);
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
			console.log('event handler error');
			console.error(err);
			return;
		}

		//console.log('recieving event');
		//console.log(data.new_val);
		let gameEvent = data.new_val;
		if(gameEvent.name !== 'server_gameEvent') {
			return;
		}

		switch(gameEvent.type) {
		case 'attack':
			console.log('attack event');
			if(!gameEvent.enemyId) {
				console.log('invalid attack event:' + gameEvent.id);
			}
			if(!gameEvent.unitId) {
				console.log('invalid attack event:' + gameEvent.id);
			}
			this.send('attack', { enemyId: gameEvent.enemyId, unitId: gameEvent.unitId });
			break;
		case 'kill':
			console.log('kill event');
			if(!gameEvent.unitId) {
				console.log('invalid kill event:' + gameEvent.id);
			}
			this.send('attack', { unitId: gameEvent.unitId });
			break;
		default:
			console.log('unhandled game event: ' + gameEvent.type);
		}
	}

	handleChat(err: Error, data: Object) {
		if(err) {
			console.log('chat handler error');
			console.log(err);
			return;
		}
		this.send('chat', data.new_val);
	}
}
module.exports = Client;
