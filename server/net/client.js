//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');
var authHandler = require('../net/handler/auth.js');

class Client {
    constructor(ws) {
        this.ws = ws;
        this.auth = false;
        this.handlers = {};
        this.handlers['login'] = authHandler;

        var self = this;

        ws.on('message',(msg) => {
            self.handleFromClient(msg);
        });
        ws.on('error',(err) => {
            logger.error(err);
        });

        ws.on('close',() => {
            self.handleLogOut();
        });

        this.send('connected');
    }

	send(type,data) {
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

	sendError(type,errMsg) {
		console.log('client error: ' + type);
		this.ws.send(JSON.stringify({type: type, success: false, reason: errMsg}));
	}

    handleLogOut() {
        logger.info('client closed connection');
        if (this.username) {
            logger.info(this.username + ' logged out');
        }
		this.ws = null;
    }

    handleFromClient(data) {
        var self = this;

        console.log('received' + data);
        data = JSON.parse(data);

        if (!data.type || !self.handlers[data.type]) {
            self.sendError('invalid','invalid request');
            return;
        }

        self.handlers[data.type](self,data);
    }
}
module.exports = Client;
