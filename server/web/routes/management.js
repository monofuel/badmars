//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;

var env = require('../../config/env.js');
var logger = require('../../util/logger.js');
var db = require('../../db/db.js');


module.exports = (app) => {
    app.get('/management/pull', (req,res) => {
        logger.requestInfo("GET /management/pull",req);
        exec('sh update.sh', (err,stdout,stderr) => {
          if (err) {
            logger.error('update_hook_error',err);
          }
        });
        res.json(JSON.stringify({success: true}));
    });
};
