//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');
var authHandler = require('../net/handler/auth.js');
var _ = require('lodash');

var filter = require('../util/socketFilter.js');

var KEEP_ALIVE = 5000;

class Client {
	constructor(ws) {
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
			} catch (err) {
				clearInterval(self.keepAlive);
			}
		}, KEEP_ALIVE);
	}

	send(type, data) {
		if (!this.ws) return;
		data = data || {};
		data.type = type;
		data.success = true;
		try {
			this.ws.send(JSON.stringify(data));
		} catch (err) {
			this.handleLogOut();
		}
	}

	sendError(type, errMsg) {
		console.log('client error: ' + type);
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
		logger.info('client closed connection');
		if (this.username) {
			logger.info('logout', {
				player: this.username
			});
		}
		if (this.unitStatWatcher) {
			this.unitStatWatcher.close();
		}
		clearInterval(this.keepAlive);
		this.ws = null;
	}

	handleFromClient(data) {
		var self = this;

		//console.log('received' + data);
		data = JSON.parse(data);

		if (!data.type || !self.handlers[data.type]) {
			self.sendError('invalid', 'invalid request');
			return;
		}

		self.handlers[data.type](self, data);
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
	handleUnitUpdate(err, delta) {
		if (!delta.new_val) {
			console.log('unit destroyed');
			if (delta.old_val) {
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

			if (delta.old_val) {
				//console.log('unit change');
				let oldUnit = filter.sanitizeUnit(delta.old_val);
				if (!_.isEqual(newUnit, oldUnit)) {
					//console.log('sending unit update');
					//if (newUnit.iron != oldUnit.iron) {
					//	console.log('sending iron change');
					//}
					this.send('units', {
						units: [newUnit]
					});
				}
			} else {
				console.log('brand new unit');
				this.send('units', {
					units: [newUnit]
				});
			}
		}
	}

	handleEvents(err, data) {
		if (err) {
			console.log('event handler error');
			console.log(err);
			return;
		}

		//console.log('recieving event');
		//console.log(data.new_val);
		let gameEvent = data.new_val;
		if (gameEvent.name !== 'server_gameEvent') {
			return;
		}

		switch(gameEvent.type) {
			case 'attack':
				console.log('attack event');
				if (!gameEvent.enemyId) {
					console.log('invalid attack event:' + gameEvent.id);
				}
				if (!gameEvent.unitId) {
					console.log('invalid attack event:' + gameEvent.id);
				}
				this.send('attack',{enemyId:gameEvent.enemyId,unitId:gameEvent.unitId});
				break;
			case 'kill':
				console.log('kill event');
				if (!gameEvent.unitId) {
					console.log('invalid kill event:' + gameEvent.id);
				}
				this.send('attack',{unitId:gameEvent.unitId});
				break;
			default:
				console.log('unhandled game event: ' + gameEvent.type);
		}
	}

	handleChat(err,data) {
		if (err) {
			console.log('chat handler error');
			console.log(err);
			return;
		}
		this.send('chat',data.new_val);
	}
}
module.exports = Client;
