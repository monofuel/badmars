/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	map
} from "./client.js";
import {
	Map
} from "./map/map.js";

const SERVER_URL = "ws://dev.japura.net"
const SERVER_PORT = 7005

export class Player {
	id: string;
	username: string;
	color: THREE.Color;
	constructor(id: string, username: string, color: string) {
		this.id = id;
		this.username = username;
		this.color = new THREE.Color();
		this.color.setHex("0x" + color);
		console.log(this.color, " ", color);
	}
}
var playerList: Array < Player > = [];

export function getPlayerByName(name: string): ? Player {
	for (var player of playerList) {
		if (player.username == name) {
			return player;
		}
	}
	return null;
}

export function getPlayerById(id: string) : ? Player {
	for (var player of playerList) {
		if (player.id == id) {
			return player;
		}
	}
	return null;
}

export class Net {
	s: WebSocket;
	self: Net;
	listeners: Object;

	constructor() {
		this.self = this;
		this.listeners = {};

	}

	connect(): Promise {
		return new Promise((resolve, reject) => {
			console.log("connecting..");
			self.s = new WebSocket(SERVER_URL + ":" + SERVER_PORT);

			self.s.onopen = () => {
				console.log("connected!");
				resolve();
			}

			self.s.onmessage = (event) => {
				var data = JSON.parse(event.data);
				console.log(data);
				if (data.login) {
					console.log('response: ', data.login);
					self.s.send(JSON.stringify({
						type: "getMap"
					}));
				} else if (data.planet) {
					window.loadPlanet(data.planet);
					self.s.send(JSON.stringify({
						type: "getPlayers"
					}));
				} else if (data.players) {
					for (var player of data.players) {
						playerList.push(new Player(player._id, player.username, player.color));
					}
					self.s.send(JSON.stringify({
						type: "getUnits"
					}));
				} else if (data.units) {
					if (window.addUnit) {
						for (var unit of data.units) {
							window.addUnit(unit);
						}
					} else {
						console.log('error: got units before planet loaded!');
					}
					//TODO check if we have any units. if not, request spawn
					self.s.send(JSON.stringify({
						type: "spawn"
					}));
				} else
				if (data.spawn) {
					if (data.spawn.indexOf('success') != -1) {
						console.log('player spawned');
						self.s.send(JSON.stringify({
							type: "getUnits"
						}));
					}
				}
			}
		});
	}

	send(data: Object) {
		self.s.send(JSON.stringify(data));
	}

	close() {
		self.s.close();
	}

	/*
	 * 0 is not connected
	 * 1 is connected
	 * 2 is closing
	 * 3 is closed
	 */
	getState(): number {
		return self.s.readyState;
	}

}
