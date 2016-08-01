//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var db = require('../db/db.js');
var env = require('../config/env.js');
var logger = require('../util/logger.js');


var express = require('express');
var path = require('path');
var mongoose = require('mongoose');

var passport = require('passport');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
//var mongoDBStore = require('connect-mongodb-session')(session);


exports.init = () => {
    var app = express();

    app.set('view engine', 'ejs');
    app.set('trust proxy', true); //for accurate logs running behind a proxy

    //TODO favicon

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: false
    }));

    app.use(flash());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '/../public')));
    app.set('views', __dirname + '/../web/views');

    require('../web/routes/main')(app);
    require('../web/routes/management')(app);

    return new Promise((resolve,reject) => {
        var server = app.listen(env.wwwPort, () => {

            var host = server.address().address;
            var port = server.address().port;

            console.log('Express listening at http://%s:%s', host, port);
            resolve();
        });
    });
};
