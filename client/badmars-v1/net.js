/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	map,
	username,
	playerInfo,
	setPlayerInfo,
	firstLoad,
	onFirstLoad,
	display,
	loginSuccess,
	setApiKey
} from "./client.js";
import {
	Map
} from "./map/map.js";

const SERVER_URL = "ws://dev.japura.net";
//const SERVER_URL = "ws://localhost";
const SERVER_PORT = 7005;

export class Player {
	id: string;
	username: string;
	color: THREE.Color;
	constructor(id: string, username: string, color: string) {
		this.id = id;
		this.username = username;
		this.color = new THREE.Color();
		this.color.setHex("0x" + color);
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

			window.sendMessage = (data) => {
				self.s.send(JSON.stringify(data));
			};

			self.s.onmessage = (event) => {
				var data = JSON.parse(event.data);
				if (data.type) {
					console.log('received message type: ', data.type);
				}
				console.log(data);
				if (data.type) {
					if (data.type == 'login') {
						if (data.success) {
							if (data.apiKey) {
								$.cookie("username", username, {
									expires: 360
								});
								$.cookie("apiKey", data.apiKey, {
									expires: 360
								});
								setApiKey(data.apiKey);
							}
							self.s.send(JSON.stringify({
								type: "getMap"
							}));
							loginSuccess();
						} else {
							console.log('failed login');
						}
					} else if (data.type == 'planet') {
						window.loadPlanet(data.planet);
						self.s.send(JSON.stringify({
							type: "getPlayers"
						}));
					} else if (data.type = 'players') {
						if (!data.players) {
							console.log('missing players in data');
							console.log(data);
							return;
						}
						for (var player of data.players) {
							playerList.push(new Player(player._id, player.username, player.color));
							if (player.username == username) {
								setPlayerInfo(player);
							}
						}
						self.s.send(JSON.stringify({
							type: "getUnits"
						}));
					} else if (data.type = 'units') {
						if (window.addUnit) {
							for (var unit of data.units) {
								window.addUnit(unit);
							}
							if (map && map.units && firstLoad) {
								for (var unit of map.units) {
									if (unit && display && playerInfo && unit.owner == playerInfo.id && onFirstLoad()) {
										console.log('zooming in on unit: ', unit);
										display.viewTile(unit.location);
									}
								}
							}

						} else {
							console.log('error: got units before planet loaded!');
						}
						//TODO check if we have any units. if not, request spawn
						self.s.send(JSON.stringify({
							type: "spawn"
						}));
					} else if (data.type == 'spawn') {
						if (data.spawn.indexOf('success') != -1) {
							console.log('player spawned');
							self.s.send(JSON.stringify({
								type: "getPlayers"
							}));
						}
					} else if (data.type == "moving" && map) {
						map.updateUnitDestination(data.unitId, data.newLocation, data.time);
					} else if (data.type == 'newUnit') {
						if (data.player) {
							playerList.push(new Player(data.player._id, data.player.username, data.player.color));
						}
						window.addUnit(data.unit);
						if (map && map.units && firstLoad) {
							if (unit && display && playerInfo && unit.owner == playerInfo.id && onFirstLoad()) {
								console.log('zooming in on unit: ', unit);
								display.viewTile(unit.location);
							}
						}
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