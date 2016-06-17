//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');
var authHandler = require('../net/handler/auth.js');
var _ = require('underscore');

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
        this.ws.send(JSON.stringify({
            type: type,
            success: false,
            reason: errMsg
        }));
    }

    handleLogOut() {
        logger.info('client closed connection');
        if (this.username) {
            logger.info(this.username + ' logged out');
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
			db.units[this.map.name].registerListener((err,delta) => {
				self.handleUnitUpdate(err,delta);
			});
		}

		//TODO also handle player list updates
		handleUnitUpdate(err,delta) {
			if (!delta.new_val) {
				console.log('unit destroyed');
				if (delta.old_val) {
					//TODO update client for new 'kill' system.
					this.send('kill',{unitId: delta.old_val.uuid});
				}
			} else {
				//TODO compare old vs new and optimize network usage. only send changes and only send things that the client should act on.
				//TODO like seriously
				//TODO this is awful

				let newUnit = sanitizeUnit(delta.new_val);
				if (delta.old_val) {
					//console.log('unit change');
					let oldUnit = sanitizeUnit(delta.old_val);
					if (! _.isEqual(newUnit,oldUnit)) {
						//console.log('sending unit update');
						//if (newUnit.iron != oldUnit.iron) {
						//	console.log('sending iron change');
						//}
						this.send('units',{units:[newUnit]});
					}
				} else {
					//console.log('brand new unit');
					this.send('units',{units:[newUnit]});
				}


			}
		}
}
module.exports = Client;

const unitKeyWhitelist = [
	'x',
	'y',
	'chunkX',
	'chunkY',
	'uuid',
	'type',
	'map',
	'iron',
	'fuel',
	'health',
	'tileHash',
	'chunkHash',
	'factoryQueue',
	'destination',
	'ghosting',
	'owner',
	'speed' //unit stats was being finnicky on the client TODO fix this
]

//TODO should break this off into a helper file
function sanitizeUnit(unit) {

	//whitelist
	let sanitized = {}
	for (let key of unitKeyWhitelist) {
		sanitized[key] = unit[key];
	}
	return sanitized;

}
