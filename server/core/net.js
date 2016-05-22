//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');
var Client = require('../net/client.js');

var WebSocketServer = require('ws').Server;

const KEEP_ALIVE = 5000;
var wss;

exports.init = () => {
    wss = new WebSocketServer({port: env.wsPort});
    wss.on('connection',(ws) => {
        new Client(ws);
    });
};