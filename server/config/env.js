//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var vars = {};

vars.envType = process.env.NODE_ENV || 'dev';

vars.ticksPerSec = process.env.TICKS_PER_SEC || 1;
vars.stressTest = process.env.STRESS_TEST || false;
vars.statReportRate = process.env.STAT_REPORT_RATE || 1; //in minutes

vars.dbHost = process.env.BADMARS_DB || 'localhost';
vars.database = process.env.BADMARS_DATABASE || 'badmars';
vars.dbPort = process.env.BADMARS_DB_PORT;
vars.dbUser = process.env.BADMARS_DB_USER;
vars.dbPassword = process.env.BADMARS_DB_PASSWORD;
vars.wwwPort = process.env.BADMARS_WWW || '3002';
vars.wsPort = process.env.BADMARS_WS_PORT || '7005';
vars.wsPublicPort = process.env.BADMARS_WS_PUBLIC_PORT || '7005';

vars.trackingServer = process.env.TRACKING_SERVER || 'japura.net';
vars.trackingPort = process.env.TRACKING_PORT || '9001';

vars.authServer = process.env.BADMARS_AUTH_SERVER || 'localhost';
vars.authDB = process.env.BADMARS_AUTH_DATABASE || 'japura';

vars.wsServer = process.env.BADMARS_WS_SERVER || 'ws://localhost';

var googleAuth = {};

googleAuth.clientID = process.env.GOOGLE_OAUTH_ID;
googleAuth.clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
googleAuth.callbackURL = process.env.GOOGLE_OAUTH_CALLBACK;
googleAuth.secret = process.env.GOOGLE_OAUTH_SECRET;

vars.googleAuth = googleAuth;

module.exports = vars;
