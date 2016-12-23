/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var express = require('express');
var router = express.Router();

var env = require('../../config/env.js');
var logger = require('../../util/logger.js');
var db = require('../../db/db.js');


module.exports = (app) => {
	app.get('/', (req, res) => {
		logger.requestInfo("GET /", req);
		db.map.listNames().then((list) => {
			res.render('pages/index', {
				worlds: list,
				user: req.user
			});
		});
	});

	app.get('/badMars_v1', (req, res) => {

		var serverAddress = env.wsServer;
		var port = env.wsPublicPort;

		res.render('pages/badmars_v1', {
			user: req.user,
			server: serverAddress,
			port: port
		});
	});
};
