
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

//TODO many config options cannot be 0, as they would be overriden by zero,
// and simply don't make sense. we should warn the operator.

export default {
	envType: process.env.NODE_ENV || 'dev',
	debug: process.env.NODE_ENV !== 'prod',

	ticksPerSec: parseInt(process.env.TICKS_PER_SEC) || 1,
	stressTest: process.env.STRESS_TEST || false,
	statReportRate: parseInt(process.env.STAT_REPORT_RATE) || 1, //in minutes
	unitProcessChunks: parseInt(process.env.UNIT_PROCESS_CHUNKS) || 20,
	pathChunks: parseInt(process.env.PATH_CHUNKS) || 3,
	chunkExamineRange: parseInt(process.env.EXAMINE_RANGE) || 4,
	attackMoveRange: parseInt(process.env.ATTACK_MOVE_RANGE) || 25,

	movementAttemptLimit: parseInt(process.env.MOVEMENT_ATTEMPT_LIMIT) || 3,
	pathComplexityLimit: parseInt(process.env.PATH_COMPLEXITY_LIMIT) || 100,
	chunkCacheLimit: parseInt(process.env.CHUNK_CACHE_LIMIT) || 5000,
	resourceTicks: parseInt(process.env.RESOURCE_TICKS) || 2,

	dbHost: process.env.BADMARS_DB || 'localhost',
	database: process.env.BADMARS_DATABASE || 'badmars',
	dbPort: parseInt(process.env.BADMARS_DB_PORT),
	dbUser: process.env.BADMARS_DB_USER,
	dbPassword: process.env.BADMARS_DB_PASSWORD,
	wwwPort: process.env.BADMARS_WWW || '3002',
	wsPort: process.env.BADMARS_WS_PORT || '7005',
	wsPublicPort: process.env.BADMARS_WS_PUBLIC_PORT || '7005',

	trackingServer: process.env.TRACKING_SERVER || 'http://192.168.11.177',
	trackingPort: process.env.TRACKING_PORT || '9001',

	authServer: process.env.BADMARS_AUTH_SERVER || 'localhost',
	authDB: process.env.BADMARS_AUTH_DATABASE || 'japura',

	wsServer: process.env.BADMARS_WS_SERVER || '/net',

	aiHost: process.env.AI_HOST || 'localhost',
	aiPort: process.env.BM_AI_PORT || '3010',
	mapHost: process.env.MAP_HOST || 'localhost',
	mapPort: process.env.BM_MAP_PORT || '3011',

	googleAuth: {
		clientID: process.env.GOOGLE_OAUTH_ID,
		callbackURL: process.env.GOOGLE_OAUTH_CALLBACK,
		secret: process.env.GOOGLE_OAUTH_SECRET,
	},
};
