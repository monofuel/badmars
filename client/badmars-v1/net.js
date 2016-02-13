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

var SERVER_URL = "ws://dev.japura.net"
var SERVER_PORT = 7005

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
					console.log(data.login);
					self.s.send(JSON.stringify({
						type: "getMap"
					}));
				} else if (data.planet) {
					window.loadPlanet(data.planet);
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
