//monofuel 2016
/* eslint-disable */
'use strict';

const _ = require('lodash');
const WebSocket = require('ws');

const SERVER_URL = 'ws://localhost';
const SERVER_PORT = 7005;

var s = new WebSocket(SERVER_URL + ':' + SERVER_PORT);
var players = [];
var units = [];
var map;
var chunks = {};

function verify(data) {
	if (!data) {
		throw new Error('no data');
	}
	if (!data.type) {
		console.log('data: ', data);
		throw new Error('no type for data');
	}
}

function sendAndCheck(data, ignoreList,check) {
	return new Promise((resolve, reject) => {
		s.onmessage = (event) => {
			var data = JSON.parse(event.data);
			verify(data);
			//ignore unit movements
			if (_.includes(ignoreList,data.type)) {
				return;
			}
			check(data);
			s.onmessage = (event) => {
				console.log('got extra packet: ', JSON.stringify(event));
			};
			resolve();
		};
		if (data) {
			s.send(JSON.stringify(data));
		}
	});
}

function connect() {
	console.log('connecting..');
	return sendAndCheck(null,['moving','players'], (data) => {
		if (data.type != 'connected') {
			throw new Error('invalid first response');
		}
		if (!data.success) {
			throw new Error('not successful');
		}
		console.log('connected!');
	});
}

function login() {
	console.log('testing login');
	return sendAndCheck({
		type: 'login',
		username: 'testUser',
		planet: 'secunda',
		color: '0xffffff',
		apiKey: '4daa3dae8c0eb1c223a3e343446e6c54'
	},['moving','players'], (data) => {
		if (!data.success) {
			console.log(data);
			throw new Error('not successful');
		}
		if (data.type != 'login') {
			console.log(data);
			throw new Error('invalid response');
		}
	});
}

function getPlayers() {
	console.log('fetching player list');
	return sendAndCheck({
		type: 'getPlayers',
	}, ['moving'],(data) => {
		if (!data.success) {
			console.log(data);
			throw new Error('not successful');
		}
		if (data.type != 'players') {
			console.log(data);
			throw new Error('invalid response');
		}
		if (!data.players) {
			console.log(data);
			throw new Error('missing players');
		}
		players = data.players;
	});
}

function getUnits() {
	console.log('fetching units list');
	return sendAndCheck({
		type: 'getUnits',
	},['moving','players'], (data) => {
		if (!data.success) {
			console.log(data);
			throw new Error('not successful');
		}
		if (data.type != 'units') {
			console.log(data);
			throw new Error('invalid response');
		}
		if (!data.units) {
			console.log(data);
			throw new Error('missing units');
		}
		units = data.units;
	});
}

function getMap() {
	console.log('fetching map');
	return sendAndCheck({
		type: 'getMap'
	},['moving','players'], (data) => {
		if (!data.success) {
			console.log(data);
			throw new Error('not successful');
		}
		if (data.type != 'map') {
			console.log(data);
			throw new Error('invalid response');
		}
		if (!data.map) {
			console.log(data);
			throw new Error('missing map');
		}
		map = data.map;
	});
}

function getChunk() {
	console.log('fetching chunk 0,0');
	return sendAndCheck({
		type: 'getChunk',
		x: 0,
		y: 0
	},['moving','players'],  (data) => {
		if (!data.success) {
			console.log(data);
			throw new Error('not successful');
		}
		if (data.type != 'chunk') {
			console.log(data);
			throw new Error('invalid response');
		}
		if (!data.chunk) {
			console.log(data);
			throw new Error('missing chunk');
		}
		chunks[data.chunk.hash] = data.chunk;
	});
}

//doesn't actually test spawning, atm just for seeing if the server validator catches anything
//not used atm as modules don't cleanly handle new maps at runtime
function spawn() {
	console.log('testing spawn');
	return sendAndCheck({
		type: 'spawn'
	},['moving','players'],  (data) => {
		if (!data.success) {
			console.log(data);
			throw new Error('not successful');
		}
	});
}

function doAllTests() {

	connect()
		.then(login)
		.then(getPlayers)
		.then(getUnits)
		.then(getMap)
		.then(getChunk)
		.then(() => {
			console.log('tests passed!');
			process.exit(0);
		});
}

doAllTests();
