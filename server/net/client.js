//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');
var netUtil = require('../net/util.js');
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

        ws.send(netUtil.success('connected'));
    }

    handleLogOut() {
        logger.info('client closed connection');
        if (this.username) {
            logger.info(this.username + ' logged out');
        }
    }

    handleFromClient(msg) {
        var self = this;

        console.log('received' + msg);
        msg = JSON.parse(msg);

        if (!msg.type || !self.handlers[msg.type]) {
            self.ws.send(netUtil.errMsg('invalid','invalid request'));
            return;
        }

        self.handlers[msg.type]();
    }
}
