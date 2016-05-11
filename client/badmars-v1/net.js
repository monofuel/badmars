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
	isFirstLoad,
	display,
	loginSuccess,
	setApiKey,
	version
} from "./client.js";
import {
	Map
} from "./map/map.js";
import {
	registerBusListener,
	deleteBusListener,
	fireBusEvent
} from './eventBus.js';

//now set by server as global values
//const SERVER_URL = "ws://dev.japura.net";
//const SERVER_URL = "ws://localhost";
//const SERVER_PORT = 7005;

// ---------------------------------------------------------------------
// globals

//map of keys to an array of functions to call
var listeners = {};

export function registerListener(eventType: string, listener: Function) {
	console.log("registering " + eventType + " listener");
	if (!listeners[eventType]) {
		listeners[eventType] = [];
	}
	if (listeners[eventType].indexOf(listener) != -1) {
		console.log("duplicate listener registered for " + eventType);
		window.track('error',{
			eventType: eventType,
			msg: 'duplicate listener'
		})
	}
	listeners[eventType].push(listener);
}

export function deleteListener(listener: Function) {
	for (var eventType of Object.keys(listeners)) {
		for (var index in listeners[eventType]) {
			if (listeners[eventType][index] == listener) {
				listeners[eventType].splice(index, 1);
			}
		}
	}
}

function connectionError(err) {
	console.log("connection lost");
	window.track("error",err);
	fireBusEvent('error','The connection to the server was lost. You should reload');
}

window.track = (name, kargs) => {
	if (!kargs)
		kargs = {};
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://104.197.78.205:9001/track/event");
	kargs.name = "badmars_v1_" + name;
	kargs.version = version;
	if (playerInfo) {
		kargs.playerName = playerInfo.username;
	}
	verifyTrack(name,kargs);
	console.log('tracking ' + name);
	console.log(kargs);
	//disabled until i get the tracking server back up
	return;
	//xhr.send(JSON.stringify(kargs));

}

function verifyTrack(name,kargs) {
	for (var key of Object.keys(kargs)) {
		if (typeof kargs[key] === 'object') {
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
			window.track('error', {
				msg: 'invalid element ' + key + ' on ' + name,
				data: JSON.stringify(kargs[key])
			})
		}
	}
}

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
		window.debug.net = this;

	}

	connect(): Promise {
		return new Promise((resolve, reject) => {
			console.log("connecting to: " + SERVER_URL + ":" + SERVER_PORT);
			self.s = new WebSocket(SERVER_URL + ":" + SERVER_PORT);

			setInterval(() => {
				if (self.s.readyState != 1) {
					connectionError();
				};
			},1000);

			self.s.onopen = () => {
				console.log("connected!");
				resolve();
			}

			self.s.onerror = () => {
				console.log("connection lost");
				window.track("error", {
					message: "connection lost"
				});
				fireBusEvent('error','The connection to the server was lost. You should reload');
			}

			window.sendMessage = (data) => {
				try {
					self.s.send(JSON.stringify(data));
				} catch (err) {
					connectionError(err);
				}
			};

			self.s.onmessage = (event) => {
				var data = JSON.parse(event.data);
				/*if (data.type) {
					console.log('received message type: ', data.type);
				}
				console.log(data);*/
				if (!data.success) {
					console.log(data);
				}
				if (data.type) {
					if (listeners[data.type]) {
						for (var listener of listeners[data.type]) {
							listener(data);
						}
					}


						if (data.type == 'planet') {
						window.loadPlanet(data.planet);
						self.s.send(JSON.stringify({
							type: "getPlayers"
						}));
					} else if (data.type == 'players') {
						if (!data.players) {
							console.log('missing players in data');
							console.log(data);
							return;
						}
						for (var player of data.players) {
							var info = new Player(player._id, player.username, player.color);
							playerList.push(info);
							if (player.username == username) {
								setPlayerInfo(info);
							}
						}
						self.s.send(JSON.stringify({
							type: "getUnits"
						}));
					} else if (data.type == 'units') {
						if (window.addUnit) {
							for (var unit of data.units) {
								window.addUnit(unit);
							}
							if (map && map.units && firstLoad) {
								for (var unit of map.units) {
									if (unit && display && playerInfo && unit.playerId && playerInfo.id && unit.playerId == playerInfo.id && isFirstLoad()) {
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
						if (data.success) {
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
							if (unit && display && playerInfo && unit.owner == playerInfo.id && isFirstLoad()) {
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
		try {
			self.s.send(JSON.stringify(data));
		} catch (err) {
			connectionError(err);
		}
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
