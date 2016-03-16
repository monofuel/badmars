//monofuel 2016
'use strict';

var WebSocket = require('ws');

const SERVER_URL = "ws://localhost";
const SERVER_PORT = 7005;

var s = new WebSocket(SERVER_URL + ":" + SERVER_PORT);
var players = [];
var units = [];

function verify(data) {
	if (!data) {
		throw new Error('no data');
	}
	if (!data.type) {
		console.log('data: ', data);
		throw new Error('no type for data');
	}
}

function sendAndCheck(data, check) {
	return new Promise((resolve, reject) => {
		s.onmessage = (event) => {
			var data = JSON.parse(event.data);
			verify(data);
			//ignore unit movements
			if (data.type == 'moving') {
				return;
			}
			check(data);
			s.onmessage = (event) => {
				console.log('got extra packet: ', JSON.stringify(event));
			};
			resolve();
		}
		if (data) {
			s.send(JSON.stringify(data));
		}
	});
}

function connect() {
	console.log('connecting..');
	return sendAndCheck(null, (data) => {
		if (data.type != 'connected') {
			throw new Error('invalid first packet')
		}
		if (!data.success) {
			throw new Error('not successful')
		}
		console.log('connected!');
	});
}

function login() {
	console.log('testing login');
	return sendAndCheck({
		type: 'login',
		username: 'testUser',
		planet: 'testPlanet3',
		color: '0xffffff',
		apiKey: 'a8189df22d4c648526fc920fba634b99'
	}, (data) => {
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
	}, (data) => {
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
	}, (data) => {
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

function doAllTests() {

	connect()
		.then(login)
		.then(getPlayers)
		.then(getUnits)
		.then(() => {
			console.log('tests passed!');
			process.exit(0);
		});
}

doAllTests();
