//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var vars = {};

vars.envType = process.env.NODE_ENV || 'dev';

vars.ticksPerSec = process.env.TICKS_PER_SEC || 2;
vars.stressTest = process.env.STRESS_TEST || false;
vars.statReportRate = process.env.STAT_REPORT_RATE || 1; //in minutes
vars.unitProcessChunks = process.env.UNIT_PROCESS_CHUNKS || 20;
vars.pathChunks = process.env.PATH_CHUNKS || 3;
vars.chunkExamineRange = process.env.EXAMINE_RANGE || 4;
vars.attackMoveRange = process.env.ATTACK_MOVE_RANGE || 25;

vars.movementAttemptLimit = process.env.MOVEMENT_ATTEMPT_LIMIT || 3;
vars.pathComplexityLimit = process.env.PATH_COMPLEXITY_LIMIT || 100;
vars.chunkCacheLimit = process.env.CHUNK_CACHE_LIMIT || 2000;

vars.dbHost = process.env.BADMARS_DB || 'rethinkdb';
vars.database = process.env.BADMARS_DATABASE || 'badmars';
vars.dbPort = process.env.BADMARS_DB_PORT;
vars.dbUser = process.env.BADMARS_DB_USER;
vars.dbPassword = process.env.BADMARS_DB_PASSWORD;
vars.wwwPort = process.env.BADMARS_WWW || '3002';
vars.wsPort = process.env.BADMARS_WS_PORT || '7005';
vars.wsPublicPort = process.env.BADMARS_WS_PUBLIC_PORT || '7005';

vars.trackingServer = process.env.TRACKING_SERVER || 'http://andrelytics.lan';
vars.trackingPort = process.env.TRACKING_PORT || '9001';

vars.authServer = process.env.BADMARS_AUTH_SERVER || 'localhost';
vars.authDB = process.env.BADMARS_AUTH_DATABASE || 'japura';

vars.wsServer = process.env.BADMARS_WS_SERVER || 'ws://shipyard.lan';

vars.aiHost = process.env.AI_HOST || 'badmars-ai';
vars.aiPort = process.env.AI_PORT || '3010';
vars.mapHost = process.env.MAP_HOST || 'badmars-chunk';
vars.mapPort = process.env.MAP_PORT || '3011';

var googleAuth = {};

googleAuth.clientID = process.env.GOOGLE_OAUTH_ID;
googleAuth.callbackURL = process.env.GOOGLE_OAUTH_CALLBACK;
googleAuth.secret = process.env.GOOGLE_OAUTH_SECRET;

vars.googleAuth = googleAuth;

module.exports = vars;
